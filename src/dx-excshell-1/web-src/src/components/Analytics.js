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
  Picker,
  Item,
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
const analyticsUrl = Object.keys(allActions).find((k) => k === 'analytics' || k.endsWith('/analytics'))
  ? allActions[Object.keys(allActions).find((k) => k === 'analytics' || k.endsWith('/analytics'))]
  : ''

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

const Analytics = (props) => {
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

  // On load: fetch all report suites and populate the Picker
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
      <Heading level={1}>Adobe Analytics Dashboard</Heading>
      <Content>Select a report suite and date range to view traffic metrics.</Content>

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
          <Flex direction="row" gap="size-200" alignItems="end" wrap marginTop="size-300">
            <Picker
              label="Report suite"
              placeholder="Select a report suite"
              items={suites.map((s) => ({ id: s.rsid, name: `${s.name} (${s.rsid})` }))}
              selectedKey={selectedSuite}
              onSelectionChange={(key) => setSelectedSuite(key)}
              width="size-4600"
            >
              {(item) => <Item key={item.id}>{item.name}</Item>}
            </Picker>

            <Picker
              label="Date range"
              items={DATE_RANGES}
              selectedKey={selectedRange}
              onSelectionChange={(key) => setSelectedRange(key)}
              width="size-2400"
            >
              {(item) => <Item key={item.id}>{item.name}</Item>}
            </Picker>

            <Button
              variant="accent"
              onPress={loadReport}
              isDisabled={!selectedSuite}
              isPending={reportLoading}
            >
              <GraphBarVertical aria-hidden />
              <span style={{ marginLeft: 8 }}>Load Report</span>
            </Button>
          </Flex>
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

Analytics.propTypes = {
  runtime: PropTypes.any,
  ims: PropTypes.any
}

export default Analytics
