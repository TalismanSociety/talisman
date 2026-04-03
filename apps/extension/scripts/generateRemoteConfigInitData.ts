// biome-ignore-all lint/suspicious/noConsole: CLI script output
import { execSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import path from "node:path"

const REMOTE_CONFIG_URL = "https://wrc.talisman.xyz/config"
const OUTPUT_PATH = path.resolve(__dirname, "../src/core/domains/app/remoteConfig.default.json")

async function generateRemoteConfigInitData() {
  console.log(`Fetching remote config from ${REMOTE_CONFIG_URL}...`)
  const response = await fetch(REMOTE_CONFIG_URL)

  if (!response.ok) throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)

  const config = await response.json()

  console.log(`Writing default config to ${OUTPUT_PATH}`)
  writeFileSync(OUTPUT_PATH, JSON.stringify(config, null, 2))

  execSync(`biome format --write '${OUTPUT_PATH}'`, { stdio: "inherit" })

  console.log("Done")
}

generateRemoteConfigInitData().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
