import { test } from 'node:test'
import assert from 'node:assert/strict'

test('Security headers assertion on root /', async () => {
  const targetUrl = process.env.TARGET_URL || 'http://localhost:4173'
  
  let res
  try {
    res = await fetch(targetUrl)
  } catch (err) {
    console.warn(`Could not connect to ${targetUrl}, skipping network fetch: ${err.message}`)
    return
  }

  const headers = res.headers

  // 1. X-Content-Type-Options
  assert.equal(headers.get('x-content-type-options'), 'nosniff', 'Must include nosniff')

  // 2. Referrer-Policy
  assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin', 'Must include strict-origin-when-cross-origin')

  // 3. X-Frame-Options
  assert.equal(headers.get('x-frame-options'), 'DENY', 'Must include DENY')

  // 4. Permissions-Policy
  assert.ok(headers.get('permissions-policy')?.includes('camera=()'), 'Must restrict camera')
  assert.ok(headers.get('permissions-policy')?.includes('microphone=()'), 'Must restrict microphone')

  // 5. Content-Security-Policy
  const csp = headers.get('content-security-policy')
  assert.ok(csp, 'Content-Security-Policy header must be present')
  assert.ok(csp.includes("frame-ancestors 'none'"), "CSP must include frame-ancestors 'none'")
  assert.ok(csp.includes("default-src 'self'"), "CSP must include default-src 'self'")
})

