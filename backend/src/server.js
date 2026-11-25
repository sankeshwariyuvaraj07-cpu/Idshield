import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { createServer } from './serverApp.js'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

const missing = ['SUPABASE_URL']
  .filter((name) => !process.env[name])
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!serviceRoleKey) {
  missing.push('SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)')
}
if (serviceRoleKey &&
  (serviceRoleKey.startsWith('sb_publishable_') ||
   serviceRoleKey.includes('replace-with'))) {
  missing.push('SUPABASE_SECRET_KEY (server-only key required, not a publishable key)')
}
if (!process.env.FASTAPI_AUTH_TOKEN && !process.env.INFERENCE_API_TOKEN) {
  missing.push('FASTAPI_AUTH_TOKEN (or INFERENCE_API_TOKEN)')
}

if (missing.length) {
  console.error(`Missing required backend environment variables: ${missing.join(', ')}`)
  process.exitCode = 1
} else {
  const port = Number(process.env.PORT || 3001)
  const app = createServer()
  app.listen(port, () => console.info(`IDShield API listening on port ${port}`))
}
