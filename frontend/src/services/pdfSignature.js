export function inspectPdfSignature(bytes) {
  const contents = new TextDecoder('latin1').decode(bytes)
  const hasByteRange = /\/ByteRange\s*\[\s*\d+\s+\d+\s+\d+\s+\d+\s*\]/.test(contents)
  const hasKnownSubFilter = /\/SubFilter\s*\/(?:adbe\.pkcs7\.detached|ETSI\.CAdES\.detached)\b/.test(contents)
  return {
    status: hasByteRange && hasKnownSubFilter ? 'signature_present_unverified' : 'not_detected',
    cryptographicVerification: 'unavailable',
  }
}
