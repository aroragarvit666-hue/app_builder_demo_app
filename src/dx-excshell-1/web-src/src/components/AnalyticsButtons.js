/*
* <license header>
*/

import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  Flex,
  Heading,
  Content,
  Text,
  ToggleButton,
  Button,
  ProgressCircle,
  InlineAlert,
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell,
  IllustratedMessage,
  Badge
} from '@adobe/react-spectrum'
import GraphBarVertical from '@spectrum-icons/workflow/GraphBarVertical'
import NotFound from '@spectrum-icons/illustrations/NotFound'

import allActions from '../config.json'
import actionWebInvoke from '../utils'

// Resolve the analytics action URL regardless of the package prefix in config.json
const analyticsKey = Object.keys(allActions).find((k) => k === 'analytics' || k.endsWith('/analytics'))
const analyticsUrl = analyticsKey ? allActions[analyticsKey] : ''

const DATE_RANGES = [
  { id: '7', name: 'Last 7 days' },
  { id: '30', name: 'Last 30 days' },
  { id: '90', name: 'Last 90 days' }
]

// Build a fully-dynamic column list: a leading Date column + one per metric.
function buildColumns (metricColumns) {
  return [{ key: 'name', name: 'Date', align: 'start' }]
    .concat(metricColumns.map((c) => ({ key: c, name: c, align: 'end' })))
}

// Flatten each report row into an object keyed by column key for dynamic rendering.
function buildItems (report) {
  return report.rows.map((r, i) => {
    const item = { id: i, name: r.name }
    report.columns.forEach((c, idx) => {
      item[c] = Number(r.values[idx]).toLocaleString()
    })
    return item
  })
}

const AnalyticsButtons = (props) => {
  const [suites, setSuites] = useState([])
  const [selectedSuite, setSelectedSuite] = useState(null)
  const [selectedRange, setSelectedRange] = useState('7')
  const [suitesLoading, setSuitesLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)

  // Build the IMS headers every call needs
  function imsHeaders () {
    const headers = {}
    if (props.ims?.token) headers.authorization = `Bearer ${props.ims.token}`
    if (props.ims?.org) headers['x-gw-ims-org-id'] = props.ims.org
    return headers
  }

  // On load: fetch all report suites and render them as buttons
  useEffect(() => {
    let active = true
    async function loadSuites () {
      if (!analyticsUrl) {
        setSuitesLoading(false)
        setError('Action URL not available yet. Deploy the app (or start the preview) to load report suites.')
        return
      }
      try {
        const res = await actionWebInvoke(analyticsUrl, imsHeaders(), { operation: 'suites' })
        if (!active) return
        setSuites(res.suites || [])
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setSuitesLoading(false)
      }
    }
    loadSuites()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load the report for the selected suite + date range
  async function loadReport () {
    setReportLoading(true)
    setError(null)
    setReport(null)
    try {
      const res = await actionWebInvoke(analyticsUrl, imsHeaders(), {
        operation: 'report',
        rsid: selectedSuite,
        days: selectedRange
      })
      setReport(res)
    } catch (e) {
      console.error(e)
      setError(e.message)
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <View width="100%" maxWidth="size-9000">
      <Heading level={1}>Analytics Dashboard Buttons</Heading>
      <Content>Pick a report suite and date range from the buttons below, then load the report.</Content>

      {error && (
        <View marginTop="size-200">
          <InlineAlert variant="negative">
            <Heading>Something went wrong</Heading>
            <Content>{error}</Content>
          </InlineAlert>
        </View>
      )}

      {suitesLoading
        ? (
          <Flex alignItems="center" justifyContent="center" height="size-3000">
            <ProgressCircle aria-label="Loading report suites" isIndeterminate size="L" />
          </Flex>
          )
        : (
          <>
            {/* Report suite selection as buttons */}
            <View marginTop="size-300">
              <Heading level={3}>Report suite</Heading>
              {suites.length === 0
                ? <Text>No report suites available.</Text>
                : (
                  <Flex direction="row" gap="size-100" wrap>
                    {suites.map((s) => (
                      <ToggleButton
                        key={s.rsid}
                        isSelected={selectedSuite === s.rsid}
                        onPress={() => setSelectedSuite(s.rsid)}
                      >
                        {s.name}
                      </ToggleButton>
                    ))}
                  </Flex>
                  )}
            </View>

            {/* Date range selection as buttons */}
            <View marginTop="size-300">
              <Heading level={3}>Date range</Heading>
              <Flex direction="row" gap="size-100" wrap>
                {DATE_RANGES.map((r) => (
                  <ToggleButton
                    key={r.id}
                    isSelected={selectedRange === r.id}
                    onPress={() => setSelectedRange(r.id)}
                  >
                    {r.name}
                  </ToggleButton>
                ))}
              </Flex>
            </View>

            <View marginTop="size-300">
              <Button
                variant="accent"
                onPress={loadReport}
                isDisabled={!selectedSuite}
                isPending={reportLoading}
              >
                <GraphBarVertical aria-hidden />
                <Text>Load Report</Text>
              </Button>
            </View>
          </>
          )}

      {report && (
        <View marginTop="size-400">
          <Flex alignItems="center" gap="size-150" marginBottom="size-150">
            <Heading level={3} margin={0}>Daily traffic</Heading>
            <Badge variant="info">{report.rows.length} days</Badge>
          </Flex>
          <TableView
            aria-label="Adobe Analytics daily traffic report"
            height="size-4600"
            renderEmptyState={() => (
              <IllustratedMessage>
                <NotFound />
                <Heading>No data</Heading>
                <Content>No metrics were returned for this suite and date range.</Content>
              </IllustratedMessage>
            )}
          >
            <TableHeader columns={buildColumns(report.columns)}>
              {(column) => (
                <Column key={column.key} align={column.align}>{column.name}</Column>
              )}
            </TableHeader>
            <TableBody items={buildItems(report)}>
              {(item) => (
                <Row>
                  {(columnKey) => <Cell>{item[columnKey]}</Cell>}
                </Row>
              )}
            </TableBody>
          </TableView>
        </View>
      )}
    </View>
  )
}

AnalyticsButtons.propTypes = {
  runtime: PropTypes.any,
  ims: PropTypes.any
}

export default AnalyticsButtons
