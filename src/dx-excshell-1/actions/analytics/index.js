/*
* <license header>
*/

/**
 * Adobe Analytics 2.0 Reporting action.
 *
 * Two modes, driven by the `operation` input param:
 *   - operation: 'suites'  -> list all report suites for a Picker
 *   - operation: 'report'  -> run a daily traffic report for a given rsid + date range
 */

const { Core } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters, checkMissingRequestInputs } = require('../utils')
const { initAnalytics } = require('../lib/analytics')

// Supported "last N days" presets the UI can request
const ALLOWED_RANGES = [7, 30, 90]

/**
 * Builds an Analytics 2.0 dateRange string ("ISO/ISO") covering the last `days` days.
 *
 * @param {number} days number of days back from today (inclusive)
 * @returns {string}
 */
function buildDateRange (days) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  const fmt = (d) => `${d.toISOString().slice(0, 10)}T00:00:00.000`
  return `${fmt(start)}/${fmt(end)}`
}

async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling the analytics action')
    logger.debug(stringParameters(params))

    const requiredHeaders = ['Authorization']
    const errorMessage = checkMissingRequestInputs(params, [], requiredHeaders)
    if (errorMessage) {
      return errorResponse(400, errorMessage, logger)
    }

    const operation = params.operation || 'suites'
    const { client } = await initAnalytics(params)

    // --- Mode 1: list report suites -----------------------------------------
    if (operation === 'suites') {
      const res = await client.getCollections({ limit: 100 })
      const suites = (res.body.content || []).map((s) => ({ rsid: s.rsid, name: s.name }))
      logger.info(`200: returned ${suites.length} report suites`)
      return { statusCode: 200, body: { suites } }
    }

    // --- Mode 2: run a report ------------------------------------------------
    if (operation === 'report') {
      const missing = checkMissingRequestInputs(params, ['rsid', 'days'], [])
      if (missing) {
        return errorResponse(400, missing, logger)
      }
      const days = parseInt(params.days, 10)
      if (!ALLOWED_RANGES.includes(days)) {
        return errorResponse(400, `days must be one of ${ALLOWED_RANGES.join(', ')}`, logger)
      }

      const reportBody = {
        rsid: params.rsid,
        globalFilters: [
          { type: 'dateRange', dateRange: buildDateRange(days) }
        ],
        metricContainer: {
          metrics: [
            { columnId: '0', id: 'metrics/pageviews' },
            { columnId: '1', id: 'metrics/visits' },
            { columnId: '2', id: 'metrics/visitors' }
          ]
        },
        dimension: 'variables/daterangeday',
        settings: { limit: 100, page: 0, nonesBehavior: 'exclude-nones' }
      }

      const res = await client.getReport(reportBody)
      const report = res.body
      const columns = ['Page Views', 'Visits', 'Visitors']
      const rows = (report.rows || []).map((r) => ({
        name: r.value,
        values: r.data
      }))
      // column totals, when the API returns them
      const totals = report.summaryData?.totals || null

      logger.info(`200: report returned ${rows.length} rows`)
      return { statusCode: 200, body: { columns, rows, totals } }
    }

    return errorResponse(400, `unknown operation '${operation}'`, logger)
  } catch (error) {
    logger.error(error)
    // aio-lib errors carry a message/code; surface the message for easier debugging
    return errorResponse(500, error.message || 'server error', logger)
  }
}

exports.main = main
