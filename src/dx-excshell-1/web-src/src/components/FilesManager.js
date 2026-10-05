/*
* <license header>
*/

import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  Flex,
  Heading,
  Content,
  Text,
  Button,
  ActionButton,
  ProgressCircle,
  InlineAlert,
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell,
  IllustratedMessage,
  Badge,
  DialogTrigger,
  AlertDialog
} from '@adobe/react-spectrum'
import UploadToCloud from '@spectrum-icons/workflow/UploadToCloud'
import Download from '@spectrum-icons/workflow/Download'
import Delete from '@spectrum-icons/workflow/Delete'
import Refresh from '@spectrum-icons/workflow/Refresh'
import NotFound from '@spectrum-icons/illustrations/NotFound'

import allActions from '../config.json'
import actionWebInvoke from '../utils'

// Resolve the files action URL regardless of the package prefix in config.json
const filesKey = Object.keys(allActions).find((k) => k === 'files' || k.endsWith('/files'))
const filesUrl = filesKey ? allActions[filesKey] : ''

// Human-readable byte size
function formatSize (bytes) {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Read a browser File into a base64 string (no data: prefix)
function fileToBase64 (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const FilesManager = (props) => {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  function imsHeaders () {
    const headers = {}
    if (props.ims?.token) headers.authorization = `Bearer ${props.ims.token}`
    if (props.ims?.org) headers['x-gw-ims-org-id'] = props.ims.org
    return headers
  }

  async function refresh () {
    if (!filesUrl) {
      setLoading(false)
      setError('Action URL not available yet. Deploy the app (or start the preview) to manage files.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await actionWebInvoke(filesUrl, imsHeaders(), { operation: 'list' })
      setFiles(res.files || [])
    } catch (e) {
      console.error(e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Trigger the hidden native file input
  function pickFile () {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  async function onFileChosen (event) {
    const file = event.target.files && event.target.files[0]
    event.target.value = '' // allow re-selecting the same file later
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const content = await fileToBase64(file)
      await actionWebInvoke(filesUrl, imsHeaders(), {
        operation: 'upload',
        path: file.name,
        content
      })
      await refresh()
    } catch (e) {
      console.error(e)
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function download (path) {
    setError(null)
    try {
      const res = await actionWebInvoke(filesUrl, imsHeaders(), { operation: 'download', path })
      if (res.url) {
        // Open the time-limited presigned URL to download the file
        window.open(res.url, '_blank', 'noopener')
      }
    } catch (e) {
      console.error(e)
      setError(e.message)
    }
  }

  async function remove (path) {
    setBusy(true)
    setError(null)
    try {
      await actionWebInvoke(filesUrl, imsHeaders(), { operation: 'delete', path })
      await refresh()
    } catch (e) {
      console.error(e)
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const items = files.map((f, i) => ({
    id: i,
    name: f.name,
    size: formatSize(f.contentLength),
    modified: f.lastModified ? new Date(f.lastModified).toLocaleString() : '—'
  }))

  return (
    <View width="100%" maxWidth="size-9000">
      <Heading level={1}>Files</Heading>
      <Content>Upload files to your app storage and download them with a secure link.</Content>

      {/* Hidden native input drives the Spectrum upload button */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={onFileChosen}
      />

      <Flex direction="row" gap="size-150" alignItems="center" marginTop="size-250">
        <Button variant="accent" onPress={pickFile} isPending={busy} isDisabled={!filesUrl}>
          <UploadToCloud aria-hidden />
          <Text>Upload file</Text>
        </Button>
        <ActionButton onPress={refresh} isDisabled={!filesUrl || loading}>
          <Refresh aria-hidden />
          <Text>Refresh</Text>
        </ActionButton>
        <Badge variant="info">{files.length} files</Badge>
      </Flex>
      <Text UNSAFE_style={{ fontSize: '12px', opacity: 0.7 }}>
        Uploads go through the action payload, so keep files under ~1 MB.
      </Text>

      {error && (
        <View marginTop="size-200">
          <InlineAlert variant="negative">
            <Heading>Something went wrong</Heading>
            <Content>{error}</Content>
          </InlineAlert>
        </View>
      )}

      <View marginTop="size-300">
        {loading
          ? (
            <Flex alignItems="center" justifyContent="center" height="size-3000">
              <ProgressCircle aria-label="Loading files" isIndeterminate size="L" />
            </Flex>
            )
          : (
            <TableView
              aria-label="Stored files"
              height="size-4600"
              renderEmptyState={() => (
                <IllustratedMessage>
                  <NotFound />
                  <Heading>No files yet</Heading>
                  <Content>Upload a file to get started.</Content>
                </IllustratedMessage>
              )}
            >
              <TableHeader>
                <Column key="name" isRowHeader>Name</Column>
                <Column key="size" align="end" width={120}>Size</Column>
                <Column key="modified" width={220}>Last modified</Column>
                <Column key="actions" align="end" width={160}>Actions</Column>
              </TableHeader>
              <TableBody items={items}>
                {(item) => (
                  <Row>
                    <Cell>{item.name}</Cell>
                    <Cell>{item.size}</Cell>
                    <Cell>{item.modified}</Cell>
                    <Cell>
                      <Flex gap="size-100" justifyContent="end">
                        <ActionButton isQuiet aria-label={`Download ${item.name}`} onPress={() => download(item.name)}>
                          <Download />
                        </ActionButton>
                        <DialogTrigger>
                          <ActionButton isQuiet aria-label={`Delete ${item.name}`}>
                            <Delete />
                          </ActionButton>
                          <AlertDialog
                            title="Delete file"
                            variant="destructive"
                            primaryActionLabel="Delete"
                            cancelLabel="Cancel"
                            onPrimaryAction={() => remove(item.name)}
                          >
                            Delete “{item.name}”? This cannot be undone.
                          </AlertDialog>
                        </DialogTrigger>
                      </Flex>
                    </Cell>
                  </Row>
                )}
              </TableBody>
            </TableView>
            )}
      </View>
    </View>
  )
}

FilesManager.propTypes = {
  runtime: PropTypes.any,
  ims: PropTypes.any
}

export default FilesManager
