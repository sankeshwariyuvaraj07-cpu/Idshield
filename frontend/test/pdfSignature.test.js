import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inspectPdfSignature } from '../src/services/pdfSignature.js'

test('PDF signature marker inspection never claims cryptographic verification', () => {
  const signedMarker = new TextEncoder().encode('%PDF-1.7 /Type /Sig /SubFilter /adbe.pkcs7.detached /ByteRange [0 100 200 300]')
  const unsignedPdf = new TextEncoder().encode('%PDF-1.7 /Type /Page')

  assert.deepEqual(inspectPdfSignature(signedMarker), {
    status: 'signature_present_unverified',
    cryptographicVerification: 'unavailable',
  })
  assert.equal(inspectPdfSignature(unsignedPdf).status, 'not_detected')
})
