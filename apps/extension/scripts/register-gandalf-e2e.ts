// biome-ignore-all lint/suspicious/noConsole: CLI script output
import { registerInstall } from "../src/core/domains/gandalf/client"

/**
 * Registers a fresh install with Gandalf (challenge + proof-of-work solve, ~10-30s
 * depending on CPU) and prints the credentials to paste into GitHub Actions secrets.
 *
 * E2E tests seed these into extension storage so test runs skip the proof-of-work,
 * which otherwise starves the background service worker on slow CI runners.
 *
 * The key is an anonymous per-install API credential (rate limiting only, no funds
 * access, revocable server-side) — but treat it as a secret: paste it into the two
 * GitHub secrets below, never commit it.
 */
async function registerGandalfE2E() {
  console.error("Registering a new Gandalf install (solving proof-of-work, this takes a while)...")
  const start = performance.now()

  const { installId, privateKeyHex } = await registerInstall()

  console.error(`Registered in ${Math.round((performance.now() - start) / 1000)}s.`)
  console.error("Paste these as GitHub Actions secrets (repo Settings > Secrets and variables):\n")
  console.log(`E2E_GANDALF_INSTALL_ID=${installId}`)
  console.log(`E2E_GANDALF_PRIVATE_KEY=${privateKeyHex}`)
}

registerGandalfE2E().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
