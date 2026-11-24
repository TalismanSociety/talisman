import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { expect, test } from "../fixtures"

// Drives the Speculos Ledger emulator through scripts/ledger-emulator.sh (docs/ledger-emulator.md).
// Speculos runs one app on one port, so the Ledger specs share one emulator and one worker.

const LAUNCHER = "scripts/ledger-emulator.sh"
// The extension connects to http://127.0.0.1:5001 (LEDGER_EMULATOR_URL), whatever the shell says.
const SPECULOS_API = "http://127.0.0.1:5001"
const launcherEnv = { ...process.env, SPECULOS_API_PORT: "5001" }

// Launcher errors that mean this machine cannot run the emulator, not that the launcher is broken.
const UNAVAILABLE = [
  /docker is required/,
  /Docker is not running/,
  /not found \(run: pnpm ledger:emulator fetch-apps\)/,
]

export type DeviceApp = "ethereum" | "polkadot" | "solana"

export const run = async (command: string, ...args: string[]) => {
  const { stdout } = await promisify(execFile)(command, args, { env: launcherEnv })
  return stdout.trim()
}

export const launcher = (...args: string[]) => run("sh", LAUNCHER, ...args)

const stderrOf = (error: unknown) => String((error as { stderr?: string }).stderr ?? error)

/** Starts the app, or keeps the emulator that already runs it: a restart costs a few seconds. */
export const startDeviceApp = async (app: DeviceApp) => {
  try {
    await launcher("start", app).catch(async (error) => {
      if (!/is running .*; run stop first/.test(stderrOf(error))) throw error
      await launcher("stop")
      await launcher("start", app)
    })
  } catch (error) {
    const stderr = stderrOf(error)
    // CI must fail when the emulator is missing: a skipped run there proves nothing
    const unavailable = !process.env.CI && UNAVAILABLE.some((pattern) => pattern.test(stderr))
    test.skip(unavailable, `Ledger emulator unavailable: ${stderr.trim()}`)
    throw error
  }
}

export const restartDeviceApp = async (app: DeviceApp) => {
  await launcher("stop")
  await launcher("start", app)
}

export const exchange = async (apdu: string) => {
  const response = await fetch(`${SPECULOS_API}/apdu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: apdu }),
  })
  const { data } = (await response.json()) as { data: string }
  expect(data.slice(-4), `status word of APDU ${apdu}`).toBe("9000")
  return Buffer.from(data.slice(0, -4), "hex")
}

export const hardened = (index: number) => (index | 0x80000000) >>> 0

const reviewShown = () =>
  expect
    .poll(() => launcher("screen"), { message: "the device shows a review", timeout: 15_000 })
    .toMatch(/review|blind signing ahead/i)

export const approveOnDevice = async () => {
  await reviewShown()
  await launcher("approve")
}

export const rejectOnDevice = async () => {
  await reviewShown()
  await launcher("reject")
}
