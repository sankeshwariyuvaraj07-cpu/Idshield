import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classifyQrDestination, summarizeQrDestinations } from '../src/services/qrSafety.js'

test('QR destinations are classified without returning or following their payloads', () => {
  const cases = [
    ['http://example.test/verify', 'insecure_http'],
    ['https://example.test/verify', 'unverified_url'],
    ['custom:payload', 'suspicious_scheme'],
    ['plain verification code', 'decoded_unverified'],
  ]

  for (const [payload, status] of cases) {
    const result = classifyQrDestination(payload)
    assert.equal(result.status, status)
    assert.equal(result.payloadReturned, false)
    assert.equal(JSON.stringify(result).includes('example.test'), false)
  }
})

test('QR summary prioritizes suspicious destinations and exposes only a count', () => {
  assert.deepEqual(summarizeQrDestinations([
    'https://example.test/verify',
    'http://example.test/verify',
  ]), {
    status: 'insecure_http',
    count: 2,
    payloadReturned: false,
    signatureVerification: 'unavailable',
    source: 'browser QR scan; payloads are not retained',
  })
})
