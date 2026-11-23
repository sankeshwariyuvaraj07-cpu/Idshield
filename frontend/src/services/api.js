import { supabase } from './supabase'

function getApiUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL
  if (configuredUrl) return configuredUrl.replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://localhost:3001/api'
  throw new Error('The backend API URL is not configured for this deployment.')
}

export async function apiRequest(path, options = {}) {
  if (!supabase) throw new Error('Supabase is not configured. Add the public Supabase URL and anon key.')
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session?.access_token) throw new Error('Sign in before using the secure backend.')

  const { body, headers = {}, ...rest } = options
  const hasJsonBody = Boolean(body) && !(body instanceof FormData) && !(body instanceof URLSearchParams)

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...rest,
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
  })

  if (response.status === 204 || response.status === 205 || response.status === 304) return null

  const text = await response.text()
  let payload = {}
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = {}
    }
  }

  if (!response.ok) throw new Error(payload.error || `Backend request failed (${response.status}).`)
  return payload
}

export function getApiBaseUrl() {
  return getApiUrl()
}
