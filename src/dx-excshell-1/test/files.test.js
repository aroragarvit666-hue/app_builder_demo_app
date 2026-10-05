/*
* <license header>
*/

const { Core, Files } = require('@adobe/aio-sdk')

const mockFilesInstance = {
  list: jest.fn(),
  write: jest.fn(),
  generatePresignURL: jest.fn(),
  delete: jest.fn()
}

jest.mock('@adobe/aio-sdk', () => ({
  Core: { Logger: jest.fn() },
  Files: { init: jest.fn() }
}))

const mockLoggerInstance = { info: jest.fn(), debug: jest.fn(), error: jest.fn() }
Core.Logger.mockReturnValue(mockLoggerInstance)
Files.init.mockResolvedValue(mockFilesInstance)

const { main } = require('../actions/files/index.js')

const authHeaders = { __ow_headers: { authorization: 'Bearer fake' } }

beforeEach(() => {
  jest.clearAllMocks()
  Core.Logger.mockReturnValue(mockLoggerInstance)
  Files.init.mockResolvedValue(mockFilesInstance)
})

describe('files action', () => {
  test('400 when Authorization header is missing', async () => {
    const res = await main({ operation: 'list' })
    expect(res.error.statusCode).toBe(400)
  })

  test('200 lists files and skips directories', async () => {
    mockFilesInstance.list.mockResolvedValue([
      { name: 'a.txt', contentLength: 10, lastModified: '2026-10-01', isDirectory: false },
      { name: 'sub/', isDirectory: true }
    ])
    const res = await main({ ...authHeaders })
    expect(res.statusCode).toBe(200)
    expect(res.body.files).toEqual([
      { name: 'a.txt', contentLength: 10, lastModified: '2026-10-01' }
    ])
  })

  test('200 uploads a base64 file', async () => {
    mockFilesInstance.write.mockResolvedValue(undefined)
    const content = Buffer.from('hello').toString('base64')
    const res = await main({ ...authHeaders, operation: 'upload', path: 'hello.txt', content })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ path: 'hello.txt', size: 5 })
    expect(mockFilesInstance.write).toHaveBeenCalledWith('hello.txt', expect.any(Buffer))
  })

  test('400 when upload is missing content', async () => {
    const res = await main({ ...authHeaders, operation: 'upload', path: 'x.txt' })
    expect(res.error.statusCode).toBe(400)
  })

  test('200 returns a presigned download url', async () => {
    mockFilesInstance.generatePresignURL.mockResolvedValue('https://signed/url')
    const res = await main({ ...authHeaders, operation: 'download', path: 'a.txt' })
    expect(res.statusCode).toBe(200)
    expect(res.body.url).toBe('https://signed/url')
    expect(mockFilesInstance.generatePresignURL).toHaveBeenCalledWith('a.txt', { expiryInSeconds: 600, permissions: 'r' })
  })

  test('200 deletes a file', async () => {
    mockFilesInstance.delete.mockResolvedValue(undefined)
    const res = await main({ ...authHeaders, operation: 'delete', path: 'a.txt' })
    expect(res.statusCode).toBe(200)
    expect(res.body.deleted).toBe(true)
    expect(mockFilesInstance.delete).toHaveBeenCalledWith('a.txt')
  })

  test('500 when the SDK throws', async () => {
    mockFilesInstance.list.mockRejectedValue(new Error('storage down'))
    const res = await main({ ...authHeaders, operation: 'list' })
    expect(res.error.statusCode).toBe(500)
    expect(res.error.body.error).toBe('storage down')
  })
})
