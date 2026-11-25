import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatDashboardDate, summarizeDashboardRecords } from '../src/services/dashboardAnalytics.js'

test('dashboard analytics use persisted records and include the latest six UTC months', () => {
  const records = [
    { id: 'repeat', created_at: '2026-11-24T10:00:00Z', analysis_status: 'complete', analysis_summary: { status: 'complete', duplicateStatus: 'duplicate_found' } },
    { id: 'pending', created_at: '2026-10-12T10:00:00Z', analysis_status: 'uploaded', analysis_summary: null },
    { id: 'failed-ocr', created_at: '2026-11-01T10:00:00Z', analysis_status: 'complete', analysis_summary: { status: 'unavailable', duplicateStatus: 'clear' } },
    { id: 'old', created_at: '2026-04-30T10:00:00Z', analysis_status: 'complete', analysis_summary: { status: 'complete', duplicateStatus: 'clear' } },
  ]

  const result = summarizeDashboardRecords(records, new Date('2026-11-24T12:00:00Z'))

  assert.equal(result.completedCount, 3)
  assert.equal(result.pendingCount, 1)
  assert.equal(result.duplicateCount, 1)
  assert.deepEqual(result.alerts.map(({ id, type }) => [id, type]), [
    ['repeat', 'duplicate'],
    ['failed-ocr', 'ocr_unavailable'],
  ])
  assert.deepEqual(result.monthlyVolume.map(({ key, count }) => [key, count]), [
    ['2026-06', 0],
    ['2026-07', 0],
    ['2026-08', 0],
    ['2026-09', 0],
    ['2026-10', 1],
    ['2026-11', 2],
  ])
})

test('dashboard date formatting degrades safely for missing timestamps', () => {
  assert.equal(formatDashboardDate('not-a-date'), 'Date unavailable')
})
