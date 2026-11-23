import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createSafetyReport,
  createSafetyReportPdf,
  parseSafetyExplanations,
  safetyReportCategories,
} from '../src/services/safetyReport.js'

test('every scan report contains all requested categories with valid status and risk values', () => {
  const report = createSafetyReport({ name: 'sample.png', remote: false })

  assert.deepEqual(report.findings.map(({ category }) => category), safetyReportCategories)
  assert.equal(report.findings.length, 12)
  for (const finding of report.findings) {
    assert.ok(['Safe', 'Suspicious', 'High Risk', 'Unable to Verify'].includes(finding.status))
    assert.ok(['Low', 'Medium', 'High'].includes(finding.riskLevel))
    assert.ok(finding.reason)
    assert.ok(finding.evidence)
    assert.ok(finding.recommendedAction)
  }
  assert.equal(report.status, 'Unable to Verify')
})

test('suspicious QR, tampering, duplicate, and expiry signals are surfaced without asserting authenticity', () => {
  const report = createSafetyReport({
    name: 'sample.png',
    remote: true,
    duplicateCheck: { status: 'duplicate_found' },
    screening: {
      qrSafety: { status: 'insecure_http' },
      visualForensics: { visualTamperSignal: true, elaScore: 20.5 },
    },
    ocrText: 'Valid until 01/01/2000',
  })

  assert.equal(report.status, 'High Risk')
  assert.equal(report.riskLevel, 'High')
  assert.equal(report.highlightedFindings.length, 5)
  assert.match(report.findings.find(({ category }) => category === 'Expiry Status').reason, /has passed/)
  assert.match(report.findings.find(({ category }) => category === 'Document Authenticity Risk').status, /Unable to Verify/)
})

test('sensitive identifiers are never included in the PDF safety report', async () => {
  const report = { name: 'sample.png', analyzedAt: '2026-01-01T00:00:00.000Z', remote: true, ocrText: 'PAN ABCDE1234F' }
  const safetyReport = createSafetyReport(report)
  const pdf = await createSafetyReportPdf(report, safetyReport).text()

  assert.match(pdf, /^%PDF-1\.4/)
  assert.match(pdf, /Sensitive Data and Privacy Risk/)
  assert.doesNotMatch(pdf, /ABCDE1234F/)
})

test('AI explanation responses must include a concise explanation for every category', () => {
  const valid = JSON.stringify({
    explanations: Object.fromEntries(safetyReportCategories.map((category) => [category, 'Review this indicator with the original document.'])),
  })
  const missingCategory = JSON.stringify({ explanations: { [safetyReportCategories[0]]: 'Review the result.' } })
  const oversized = JSON.stringify({
    explanations: Object.fromEntries(safetyReportCategories.map((category) => [category, 'x'.repeat(421)])),
  })

  assert.equal(Object.keys(parseSafetyExplanations(valid)).length, 12)
  assert.equal(parseSafetyExplanations(missingCategory), null)
  assert.equal(parseSafetyExplanations(oversized), null)
})
