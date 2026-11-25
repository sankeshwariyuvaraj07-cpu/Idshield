const MONTHS_TO_DISPLAY = 6
const UTC_MONTH_LABEL = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' })

export function formatDashboardDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function summarizeDashboardRecords(records, now = new Date()) {
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const monthlyVolume = Array.from({ length: MONTHS_TO_DISPLAY }, (_, index) => {
    const date = new Date(Date.UTC(
      currentMonth.getUTCFullYear(),
      currentMonth.getUTCMonth() - (MONTHS_TO_DISPLAY - index - 1),
      1,
    ))
    const key = date.toISOString().slice(0, 7)
    return { key, label: UTC_MONTH_LABEL.format(date), count: 0 }
  })
  const monthsByKey = new Map(monthlyVolume.map((month) => [month.key, month]))
  const alerts = []
  let completedCount = 0
  let pendingCount = 0
  let duplicateCount = 0

  for (const record of records) {
    if (record.analysis_status === 'complete') completedCount += 1
    else pendingCount += 1

    const date = new Date(record.created_at)
    if (!Number.isNaN(date.getTime())) {
      const month = monthsByKey.get(date.toISOString().slice(0, 7))
      if (month) month.count += 1
    }

    const summary = record.analysis_summary || {}
    if (summary.duplicateStatus === 'duplicate_found') {
      duplicateCount += 1
      alerts.push({ id: record.id, type: 'duplicate', createdAt: record.created_at })
    } else if (record.analysis_status === 'complete' && summary.status === 'unavailable') {
      alerts.push({ id: record.id, type: 'ocr_unavailable', createdAt: record.created_at })
    }
  }

  return { completedCount, pendingCount, duplicateCount, alerts, monthlyVolume }
}
