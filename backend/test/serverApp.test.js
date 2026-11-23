import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer, isValidE164Phone, requestDashScopeModel } from '../src/serverApp.js'

const app = createServer({
  env: {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    INFERENCE_API_TOKEN: 'test-inference-token',
    FRONTEND_ORIGINS: 'http://localhost:5173',
  },
})
let server
let baseUrl

before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test('health endpoint confirms API process availability', async () => {
  const response = await fetch(`${baseUrl}/healthz`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
})

test('private document API rejects requests without an access token', async () => {
  const response = await fetch(`${baseUrl}/api/documents/upload-intents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), { error: 'A valid sign-in session is required.' })
})

test('phone profile updates require an authenticated session', async () => {
  const response = await fetch(`${baseUrl}/api/me/phone`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919876543210' }),
  })
  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), { error: 'A valid sign-in session is required.' })
})

test('phone numbers must use international E.164 format', () => {
  assert.equal(isValidE164Phone('+919876543210'), true)
  assert.equal(isValidE164Phone('+12025550123'), true)
  assert.equal(isValidE164Phone('9876543210'), false)
  assert.equal(isValidE164Phone('+0123456789'), false)
  assert.equal(isValidE164Phone('+1234567'), false)
})

test('DashScope assistant uses the OpenAI-compatible chat endpoint', async () => {
  let requestUrl
  let requestOptions
  const fetchImpl = async (url, options) => {
    requestUrl = url
    requestOptions = options
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'Authorized human review is required.' } }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await requestDashScopeModel(fetchImpl, {
    DASHSCOPE_API_KEY: 'test-dashscope-key',
    DASHSCOPE_BASE_URL: 'https://example.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
    DASHSCOPE_MODEL: 'qwen3.7-max',
  }, {
    systemInstruction: 'Explain limits.',
    message: 'Is this document valid?',
    history: [],
  })

  assert.deepEqual(result, { content: 'Authorized human review is required.' })
  assert.equal(requestUrl, 'https://example.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions')
  assert.equal(requestOptions.headers.Authorization, 'Bearer test-dashscope-key')
  const payload = JSON.parse(requestOptions.body)
  assert.equal(payload.model, 'qwen3.7-max')
  assert.equal(payload.stream, false)
  assert.equal(payload.extra_body.enable_thinking, false)
})

test('Transit image analysis rejects requests without an access token', async () => {
  const response = await fetch(`${baseUrl}/api/transit/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: new Uint8Array([1, 2, 3]),
  })
  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), { error: 'A valid sign-in session is required.' })
})

test('API rejects disallowed browser origins', async () => {
  const response = await fetch(`${baseUrl}/healthz`, {
    headers: { Origin: 'https://untrusted.example' },
  })
  assert.equal(response.status, 403)
})

test('preflight permits the private-file delete request from the configured frontend', async () => {
  const response = await fetch(`${baseUrl}/api/documents/00000000-0000-4000-8000-000000000001`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'DELETE',
    },
  })
  assert.equal(response.status, 204)
  assert.match(response.headers.get('access-control-allow-methods'), /DELETE/)
})
