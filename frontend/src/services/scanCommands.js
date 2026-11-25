export function resolveScanVoiceCommand(transcript) {
  const command = String(transcript || '').toLowerCase().trim()
  if (/\b(stop|close)\s+(the\s+)?camera\b/.test(command)) return 'stop_camera'
  if (/\b(open|start)\s+(the\s+)?(face|selfie)\s+camera\b/.test(command)) return 'open_face_camera'
  if (/\b(capture|take)\s+(a\s+)?(face|selfie|portrait)\b/.test(command)) return 'capture_face'
  if (/\b(open|start)\s+(the\s+)?camera\b|\bstart scanning\b/.test(command)) return 'open_camera'
  if (/\b(capture|take)\s+(a\s+)?(document|scan|picture|photo|image)\b/.test(command)) return 'capture_document'
  return null
}
