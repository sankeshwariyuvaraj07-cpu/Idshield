export function classifyQrDestination(payload) {
  if (typeof payload !== 'string' || !payload.trim()) {
    return { status: 'unreadable', payloadReturned: false }
  }

  let url
  try {
    url = new URL(payload.trim())
  } catch {
    return { status: 'decoded_unverified', payloadReturned: false }
  }

  if (url.protocol === 'http:' && url.hostname) {
    return { status: 'insecure_http', payloadReturned: false }
  }
  if (url.protocol === 'https:' && url.hostname) {
    return { status: 'unverified_url', payloadReturned: false }
  }
  return { status: 'suspicious_scheme', payloadReturned: false }
}

export function summarizeQrDestinations(payloads) {
  const results = payloads.map(classifyQrDestination)
  const priority = ['suspicious_scheme', 'insecure_http', 'unverified_url', 'decoded_unverified', 'unreadable']
  const status = priority.find((candidate) => results.some((result) => result.status === candidate)) || 'not_found'
  return {
    status,
    count: results.length,
    payloadReturned: false,
    signatureVerification: 'unavailable',
    source: 'browser QR scan; payloads are not retained',
  }
}
