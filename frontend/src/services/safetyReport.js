const categories = [
  'Safety Assessment',
  'Harmful Content Detection',
  'Document Authenticity Risk',
  'Identity Theft Risk',
  'Financial Fraud Risk',
  'Cybersecurity Risk',
  'QR Code and URL Safety',
  'Document Tampering Detection',
  'Duplicate Document Detection',
  'Expiry Status',
  'Sensitive Data and Privacy Risk',
  'Cross-Document Information Mismatch',
]

function finding(category, status, riskLevel, reason, evidence, recommendedAction) {
  return { category, status, riskLevel, reason, evidence, recommendedAction }
}

function parseExpiry(text) {
  const match = text.match(
    /(?:expiry|expires|valid\s*(?:until|through|till)|date\s*of\s*expiry)\s*[:-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2})/i,
  )
  if (!match) return null

  let year
  let month
  let day
  if (/^\d{4}-/.test(match[1])) {
    [year, month, day] = match[1].split('-').map(Number)
  } else {
    [day, month, year] = match[1].split(/[/-]/).map(Number)
  }
  const expiryDate = new Date(Date.UTC(year, month - 1, day))
  if (expiryDate.getUTCFullYear() !== year ||
    expiryDate.getUTCMonth() !== month - 1 ||
    expiryDate.getUTCDate() !== day) return null

  const today = new Date()
  const daysUntilExpiry = Math.ceil(
    (Date.UTC(year, month - 1, day) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
    86_400_000,
  )
  return { daysUntilExpiry, date: match[1] }
}

export function createSafetyReport(report) {
  const screening = report.screening || {}
  const visualForensics = screening.visualForensics || {}
  const qrSafety = screening.qrSafety || {}
  const duplicateCheck = report.duplicateCheck || {}
  const ocrText = report.ocrText || ''
  const hasSensitiveIdentifier =
    /\b[A-Z]{5}\d{4}[A-Z]\b/i.test(ocrText) ||
    /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/.test(ocrText)
  const expiry = parseExpiry(ocrText)
  const tamperSignal = visualForensics.visualTamperSignal === true
  const layoutSignal = report.localModelReview?.layoutObservation === 'possible_spacing_irregularity'
  const qrStatus = qrSafety.status

  const findings = [
    finding(
      'Safety Assessment',
      'Unable to Verify',
      'Medium',
      'The configured checks provide limited screening signals, not a complete safety or authenticity determination.',
      report.remote ? 'OCR and selected image checks ran; no issuer or trained fraud model is connected.' : 'This is a synthetic local demonstration; forensic checks were not run.',
      'Treat this report as a triage aid and have an authorized reviewer verify the original document.',
    ),
    finding(
      'Harmful Content Detection',
      'Unable to Verify',
      'Medium',
      'No harmful-content classifier is configured for document text or imagery.',
      'No content moderation result is available.',
      'Review the document manually in a controlled environment.',
    ),
    finding(
      'Document Authenticity Risk',
      'Unable to Verify',
      'Medium',
      'No issuing-authority verification or calibrated authenticity model is connected.',
      'File signature and SHA-256 establish file format and byte integrity only; they do not prove authenticity.',
      'Verify the document through its official issuer using an approved process.',
    ),
    finding(
      'Identity Theft Risk',
      'Unable to Verify',
      'Medium',
      'Identity misuse cannot be assessed from the available scan signals.',
      hasSensitiveIdentifier
        ? 'An identity-number pattern was detected, but that alone does not indicate identity theft; the value is omitted from this report.'
        : 'No identity-theft signal was assessed.',
      'Restrict report access, avoid sharing unmasked OCR text, and follow your organization’s privacy procedures.',
    ),
    finding(
      'Financial Fraud Risk',
      'Unable to Verify',
      'Medium',
      'No financial-fraud model, account validation, or issuer check is configured.',
      'No financial fraud indicator was assessed.',
      'Verify any payment or account details independently through a trusted channel.',
    ),
    finding(
      'Cybersecurity Risk',
      qrStatus === 'insecure_http' || qrStatus === 'suspicious_scheme' ? 'High Risk' : 'Unable to Verify',
      qrStatus === 'insecure_http' || qrStatus === 'suspicious_scheme' ? 'High' : 'Medium',
      qrStatus === 'insecure_http'
        ? 'A QR code contains an unencrypted HTTP destination; its ownership and content were not checked.'
        : qrStatus === 'suspicious_scheme'
          ? 'A QR code contains a non-web or unsupported destination scheme.'
          : 'Embedded links, active PDF content, and malware are not scanned by this prototype.',
      qrStatus === 'insecure_http' || qrStatus === 'suspicious_scheme'
        ? 'QR payload was classified without returning or opening its contents.'
        : 'No malware or embedded-content scan result is available.',
      'Do not open untrusted links or files. Use an up-to-date security scanner and approved network controls.',
    ),
    finding(
      'QR Code and URL Safety',
      qrStatus === 'insecure_http' || qrStatus === 'suspicious_scheme'
        ? 'High Risk'
        : qrStatus === 'decoded_unverified' || qrStatus === 'unverified_url'
          ? 'Unable to Verify'
          : 'Unable to Verify',
      qrStatus === 'insecure_http' || qrStatus === 'suspicious_scheme' ? 'High' : 'Medium',
      qrStatus === 'insecure_http'
        ? 'The decoded QR destination uses HTTP and is not encrypted.'
        : qrStatus === 'suspicious_scheme'
          ? 'The decoded QR destination uses an unsupported scheme.'
          : qrStatus === 'decoded_unverified' || qrStatus === 'unverified_url'
            ? 'A QR destination was decoded, but its destination, signature, and reputation were not verified.'
            : 'No readable QR destination was available to assess.',
      qrStatus
        ? `QR scan status: ${qrStatus}; destination contents are not included in this report.`
        : 'QR inspection was unavailable or not run.',
      'Do not follow the destination until it is independently verified through an official source.',
    ),
    finding(
      'Document Tampering Detection',
      tamperSignal || layoutSignal ? 'Suspicious' : 'Unable to Verify',
      tamperSignal || layoutSignal ? 'Medium' : 'Medium',
      tamperSignal
        ? 'The JPEG recompression heuristic found an image-level signal that may warrant inspection; it is not proof of editing.'
        : layoutSignal
          ? 'The visual review noted a possible spacing irregularity; it is not proof of manipulation.'
          : 'Available image heuristics cannot establish that a document is untampered.',
      tamperSignal
        ? `ELA score: ${visualForensics.elaScore ?? 'available'}; no localized region coordinates were produced.`
        : layoutSignal
          ? 'Possible spacing irregularity noted by the local visual review; no localized region coordinates were produced.'
          : 'No calibrated tampering detector or region-localization output is available.',
      'Compare the original with an issuer copy and inspect the indicated image-level signal manually.',
    ),
    finding(
      'Duplicate Document Detection',
      duplicateCheck.status === 'duplicate_found'
        ? 'Suspicious'
        : duplicateCheck.status === 'clear'
          ? 'Safe'
          : 'Unable to Verify',
      duplicateCheck.status === 'duplicate_found' ? 'High' : duplicateCheck.status === 'clear' ? 'Low' : 'Medium',
      duplicateCheck.status === 'duplicate_found'
        ? 'An exact SHA-256 match exists in this account’s previously uploaded documents.'
        : duplicateCheck.status === 'clear'
          ? 'No exact SHA-256 match was found among this account’s stored documents.'
          : 'A duplicate check could not be completed.',
      duplicateCheck.status === 'duplicate_found'
        ? 'The current file bytes match a previously uploaded file; this does not establish fraud.'
        : duplicateCheck.status === 'clear'
          ? 'Exact-byte comparison completed for this account only; visually similar files are not detected.'
          : 'No prior-document comparison result is available.',
      'Confirm whether the repeat upload is expected; report unexpected reuse to an authorized reviewer.',
    ),
    finding(
      'Expiry Status',
      expiry && expiry.daysUntilExpiry < 0
        ? 'Suspicious'
        : expiry
          ? 'Safe'
          : 'Unable to Verify',
      expiry && expiry.daysUntilExpiry < 0 ? 'High' : expiry ? 'Low' : 'Medium',
      expiry && expiry.daysUntilExpiry < 0
        ? 'OCR found a labeled expiry date that has passed.'
        : expiry
          ? 'OCR found a labeled expiry date that has not passed; this does not verify document validity.'
          : 'No unambiguous labeled expiry date could be assessed from the available OCR text.',
      expiry
        ? `Labeled expiry date detected: ${expiry.date}. OCR date extraction may be inaccurate.`
        : 'Expiry date was not confidently identified.',
      'Confirm the expiry date and current validity with the issuing authority.',
    ),
    finding(
      'Sensitive Data and Privacy Risk',
      hasSensitiveIdentifier ? 'Suspicious' : 'Unable to Verify',
      'Medium',
      hasSensitiveIdentifier
        ? 'Sensitive identifier-like data was present in OCR output held in this report session.'
        : 'The scan cannot establish whether all sensitive information is recognized or protected.',
      hasSensitiveIdentifier
        ? 'Identifier values are not reproduced here; OCR text remains visible only in the active report session.'
        : 'No privacy classification result is available.',
      'Limit access, avoid exporting or sharing raw OCR text, and delete the private upload when it is no longer needed.',
    ),
    finding(
      'Cross-Document Information Mismatch',
      'Unable to Verify',
      'Medium',
      'Only one document was analyzed, so identity fields could not be compared across documents.',
      'No cross-document comparison data was supplied.',
      'Compare relevant fields across authorized source documents and resolve transliteration or OCR differences manually.',
    ),
  ]

  const evaluatedFindings = findings.slice(1)
  const suspiciousCount = evaluatedFindings.filter((item) => item.status === 'Suspicious' || item.status === 'High Risk').length
  const highRiskStatusCount = evaluatedFindings.filter((item) => item.status === 'High Risk').length
  const safeCount = evaluatedFindings.filter((item) => item.status === 'Safe').length
  const overallStatus = highRiskStatusCount ? 'High Risk' : suspiciousCount ? 'Suspicious' : 'Unable to Verify'
  const riskLevel = evaluatedFindings.some((item) => item.riskLevel === 'High') ? 'High' : 'Medium'
  const explanation = suspiciousCount
    ? `${suspiciousCount} review indicator${suspiciousCount === 1 ? '' : 's'} require attention. ${evaluatedFindings.length - suspiciousCount - safeCount} checks remain unverified; no automatic authenticity decision was made.`
    : 'No configured check established a complete safety result. Several categories remain unverified, so manual review is required.'

  findings[0] = finding(
    'Safety Assessment',
    overallStatus,
    riskLevel,
    explanation,
    `${suspiciousCount} review indicator${suspiciousCount === 1 ? '' : 's'}; ${evaluatedFindings.length - suspiciousCount - safeCount} other categories remain unverified.`,
    'Treat this report as a triage aid and have an authorized reviewer verify the original document.',
  )
  return {
    status: overallStatus,
    riskLevel,
    explanation,
    findings,
    highlightedFindings: evaluatedFindings.filter((item) => item.status === 'Suspicious' || item.status === 'High Risk'),
    regionNotice: 'The available analysis does not return pixel coordinates. Review indicators are highlighted below, but suspicious image regions cannot be outlined reliably.',
  }
}

function ascii(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/[\\()]/g, '\\$&')
}

function wrapLine(value, width = 88) {
  const words = String(value).split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    if (line && `${line} ${word}`.length > width) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines
}

export function createSafetyReportPdf(report, safetyReport) {
  const lines = [
    'IDShield AI - Safety and Risk Assessment',
    `File: ${report.name}`,
    `Document type: ${report.type || 'Not specified'}`,
    `Analyzed: ${new Date(report.analyzedAt).toLocaleString()}`,
    `SHA-256: ${report.hash || 'Unavailable'}`,
    `Overall status: ${safetyReport.status}`,
    `Overall risk level: ${safetyReport.riskLevel}`,
    ...wrapLine(safetyReport.explanation),
    '',
    ...safetyReport.findings.flatMap((item) => [
      `${item.category} | ${item.status} | ${item.riskLevel} risk`,
      ...wrapLine(`Reason: ${item.reason}`),
      ...(item.explanation ? wrapLine(`AI explanation: ${item.explanation}`) : []),
      ...wrapLine(`Evidence: ${item.evidence}`),
      ...wrapLine(`Recommended action: ${item.recommendedAction}`),
      '',
    ]),
    ...wrapLine(safetyReport.regionNotice),
    'This automated report is a triage aid, not proof of authenticity, fraud, or legal validity.',
    'OCR text and unmasked identity-number values are intentionally excluded.',
  ].flatMap((line) => wrapLine(line))

  const pages = []
  for (let index = 0; index < lines.length; index += 48) pages.push(lines.slice(index, index + 48))
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  pages.forEach((pageLines, index) => {
    const pageId = 4 + index * 2
    const contentId = pageId + 1
    const text = pageLines.map((line) => `(${ascii(line)}) Tj T*`).join('\n')
    const stream = `BT\n/F1 9 Tf\n50 790 Td\n12 TL\n${text}\nET`
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

export function downloadSafetyReportPdf(report, safetyReport) {
  const url = URL.createObjectURL(createSafetyReportPdf(report, safetyReport))
  const link = document.createElement('a')
  link.href = url
  link.download = 'idshield-safety-report.pdf'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const safetyReportCategories = categories

export function parseSafetyExplanations(reply) {
  let parsed
  try {
    parsed = JSON.parse(reply)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.explanations || typeof parsed.explanations !== 'object') {
    return null
  }

  const explanations = {}
  for (const category of categories) {
    const text = parsed.explanations[category]
    if (typeof text !== 'string' || !text.trim() || text.length > 420) return null
    explanations[category] = text.trim()
  }
  return explanations
}
