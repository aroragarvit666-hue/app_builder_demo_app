/*
* <license header>
*/

const { Core } = require('@adobe/aio-sdk')

jest.mock('@adobe/aio-sdk', () => ({
  Core: { Logger: jest.fn() }
}))

// Mock the analytics lib so no real token / network call happens
const mockGetCollections = jest.fn()
const mockGetReport = jest.fn()
jest.mock('../actions/lib/analytics', () => ({
  initAnalytics: jest.fn(async () => ({
    client: { getCollections: mockGetCollections, getReport: mockGetReport },
    globalCompanyId: 'company1'
  }))
}))

const mockLoggerInstance = { info: jest.fn(), debug: jest.fn(), error: jest.fn() }
Core.Logger.mockReturnValue(mockLoggerInstance)

const { main } = require('../actions/analytics/index.js')

// Authenticated request baseline
const authHeaders = { __ow_headers: { authorization: 'Bearer fake' } }

beforeEach(() => {
  jest.clearAllMocks()
  Core.Logger.mockReturnValue(mockLoggerInstance)
})

describe('analytics action', () => {
  test('400 when Authorization header is missing', async () => {
    const res = await main({ operation: 'suites' })
    expect(res.error.statusCode).toBe(400)
    expect(res.error.body.error).toContain('authorization')
  })

  test('200 lists report suites (default operation)', async () => {
    mockGetCollections.mockResolvedValue({
      body: { content: [{ rsid: 'rs1', name: 'Suite One' }, { rsid: 'rs2', name: 'Suite Two' }] }
    })
    const res = await main({ ...authHeaders })
    expect(res.statusCode).toBe(200)
    expect(res.body.suites).toEqual([
      { rsid: 'rs1', name: 'Suite One' },
      { rsid: 'rs2', name: 'Suite Two' }
    ])
    expect(mockGetCollections).toHaveBeenCalledWith({ limit: 100 })
  })

  test('400 when report is missing rsid/days', async () => {
    const res = await main({ ...authHeaders, operation: 'report' })
    expect(res.error.statusCode).toBe(400)
  })

  test('400 when days is not an allowed preset', async () => {
    const res = await main({ ...authHeaders, operation: 'report', rsid: 'rs1', days: '14' })
    expect(res.error.statusCode).toBe(400)
    expect(res.error.body.error).toContain('days must be one of')
  })

  test('200 runs a report', async () => {
    mockGetReport.mockResolvedValue({
      body: {
        rows: [
          { value: 'Oct 1, 2026', data: [100, 80, 70] },
          { value: 'Oct 2, 2026', data: [120, 90, 75] }
        ]
      }
    })
    const res = await main({ ...authHeaders, operation: 'report', rsid: 'rs1', days: '7' })
    expect(res.statusCode).toBe(200)
    expect(res.body.columns).toEqual(['Page Views', 'Visits', 'Visitors'])
    expect(res.body.rows).toHaveLength(2)
    expect(res.body.rows[0]).toEqual({ name: 'Oct 1, 2026', values: [100, 80, 70] })
    // report body carries the correct rsid, dimension and metrics
    const sentBody = mockGetReport.mock.calls[0][0]
    expect(sentBody.rsid).toBe('rs1')
    expect(sentBody.dimension).toBe('variables/daterangeday')
    expect(sentBody.metricContainer.metrics).toHaveLength(3)
  })

  test('500 when the SDK throws', async () => {
    mockGetCollections.mockRejectedValue(new Error('rate limited'))
    const res = await main({ ...authHeaders, operation: 'suites' })
    expect(res.error.statusCode).toBe(500)
    expect(res.error.body.error).toBe('rate limited')
  })
})
