import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const PLACEHOLDER = 'REPLACE-WITH-YOUR-BACKEND-HOST'

/**
 * Fail the BUILD when VITE_API_URL is not a usable backend origin.
 *
 * Why this is worth failing over: .github/workflows/deploy.yml runs on every push
 * to main, builds, and then rsyncs dist/ to reeferclothing.com with --delete. Vite
 * inlines VITE_API_URL into the bundle at build time, so a bad value is not a
 * runtime misconfiguration anyone can hotfix on the server — it is baked into the
 * shipped JS. Combined with --delete, a build made with the placeholder replaces a
 * working site with one whose every API call goes nowhere, and nothing in the
 * pipeline complains: npm ci succeeds, vite build succeeds, rsync succeeds, the
 * workflow prints "Deployed" in green.
 *
 * So the check lives here, at the only point that sees the value before it is
 * frozen. A failed Action leaves the live site untouched.
 *
 * Build-time only — `vite dev` skips it, so a fresh clone can still be started
 * without configuring anything.
 */
function assertApiUrl(value) {
  const hint =
    '\n  Set VITE_API_URL in .env.production to the deployed ash-ai-backend, e.g.' +
    '\n      VITE_API_URL=https://api.reeferclothing.com/api/storefront' +
    '\n  src/api/ appends the /v1 itself, so calls land on <origin>/api/storefront/v1/....\n'

  if (!value || !value.trim()) {
    throw new Error(`[reefer] VITE_API_URL is empty — the build would ship a bundle that calls nothing.${hint}`)
  }

  if (value.includes(PLACEHOLDER)) {
    throw new Error(
      `[reefer] VITE_API_URL is still the placeholder (${PLACEHOLDER}).` +
        `\n  This is the one value that must be filled in before the storefront can go live.${hint}`,
    )
  }

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`[reefer] VITE_API_URL is not a valid absolute URL: ${value}${hint}`)
  }

  // An https page cannot call an http API — the browser blocks it as mixed content,
  // which looks exactly like the API being down. localhost is exempt: `vite preview`
  // against a local backend is a legitimate way to test a production build.
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !isLocal) {
    throw new Error(
      `[reefer] VITE_API_URL must be https for a deployed build (got ${url.protocol}//${url.host}).` +
        `\n  reeferclothing.com is served over https, and browsers block http calls from an https page.${hint}`,
    )
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    // Same resolution vite itself uses: .env, then .env.<mode> wins. Resolved
    // against this file's own directory rather than the cwd, so the check reads
    // the same .env.production the build does no matter where npm was invoked.
    assertApiUrl(loadEnv(mode, import.meta.dirname, 'VITE_').VITE_API_URL)
  }

  return {
    plugins: [react()],
  }
})
