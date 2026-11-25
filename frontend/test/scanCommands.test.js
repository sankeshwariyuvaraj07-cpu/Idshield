import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveScanVoiceCommand } from '../src/services/scanCommands.js'

test('voice scan commands map only explicit camera actions', () => {
  assert.equal(resolveScanVoiceCommand('Open camera'), 'open_camera')
  assert.equal(resolveScanVoiceCommand('capture document'), 'capture_document')
  assert.equal(resolveScanVoiceCommand('open selfie camera'), 'open_face_camera')
  assert.equal(resolveScanVoiceCommand('take a selfie'), 'capture_face')
  assert.equal(resolveScanVoiceCommand('stop camera'), 'stop_camera')
  assert.equal(resolveScanVoiceCommand('is this document authentic?'), null)
  assert.equal(resolveScanVoiceCommand(''), null)
})
