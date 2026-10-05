/*
* <license header>
*/

/**
 * Adobe I/O Files action — a small file manager backend.
 *
 * Operations (driven by the `operation` input param):
 *   - list     -> list stored files
 *   - upload   -> write a base64-encoded file (small files; action payload max ~1MB)
 *   - download -> return a time-limited presigned URL the browser can fetch directly
 *   - delete   -> remove a file
 *
 * NOTE: the Files SDK needs real Runtime credentials — run with `aio app run`
 * (or a deployed app), not the stateless `aio app dev`.
 */

const { Core, Files } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters, checkMissingRequestInputs } = require('../utils')

async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling the files action')
    logger.debug(stringParameters(params))

    const requiredHeaders = ['Authorization']
    const errorMessage = checkMissingRequestInputs(params, [], requiredHeaders)
    if (errorMessage) {
      return errorResponse(400, errorMessage, logger)
    }

    const operation = params.operation || 'list'
    const files = await Files.init()

    // --- list ---------------------------------------------------------------
    if (operation === 'list') {
      const entries = await files.list('/')
      const list = (entries || [])
        .map((e) => (typeof e === 'string' ? { name: e } : e))
        .filter((e) => !e.isDirectory)
        .map((e) => ({
          name: e.name,
          contentLength: e.contentLength ?? null,
          lastModified: e.lastModified ?? null
        }))
      logger.info(`200: listed ${list.length} files`)
      return { statusCode: 200, body: { files: list } }
    }

    // --- upload --------------------------------------------------------------
    if (operation === 'upload') {
      const missing = checkMissingRequestInputs(params, ['path', 'content'], [])
      if (missing) {
        return errorResponse(400, missing, logger)
      }
      const buffer = Buffer.from(params.content, 'base64')
      await files.write(params.path, buffer)
      logger.info(`200: uploaded ${params.path} (${buffer.length} bytes)`)
      return { statusCode: 200, body: { path: params.path, size: buffer.length } }
    }

    // --- download (presigned URL) -------------------------------------------
    if (operation === 'download') {
      const missing = checkMissingRequestInputs(params, ['path'], [])
      if (missing) {
        return errorResponse(400, missing, logger)
      }
      const url = await files.generatePresignURL(params.path, {
        expiryInSeconds: 600,
        permissions: 'r'
      })
      logger.info(`200: presigned download url for ${params.path}`)
      return { statusCode: 200, body: { path: params.path, url } }
    }

    // --- delete --------------------------------------------------------------
    if (operation === 'delete') {
      const missing = checkMissingRequestInputs(params, ['path'], [])
      if (missing) {
        return errorResponse(400, missing, logger)
      }
      await files.delete(params.path)
      logger.info(`200: deleted ${params.path}`)
      return { statusCode: 200, body: { path: params.path, deleted: true } }
    }

    return errorResponse(400, `unknown operation '${operation}'`, logger)
  } catch (error) {
    logger.error(error)
    return errorResponse(500, error.message || 'server error', logger)
  }
}

exports.main = main
