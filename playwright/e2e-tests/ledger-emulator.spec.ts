import { execFile } from "node:child_process"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { promisify } from "node:util"

import type { Page } from "@playwright/test"
import { type Hex, recoverMessageAddress } from "viem"

import { expect, test } from "./fixtures"

// Runs the real Ethereum, Polkadot and Solana device apps in Speculos (docs/ledger-emulator.md).
// Speculos runs one app on one port, so the tests share one emulator and run one at a time.

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

type DeviceApp = "ethereum" | "polkadot" | "solana"

const launcher = async (...args: string[]) => {
  const { stdout } = await promisify(execFile)("sh", [LAUNCHER, ...args], { env: launcherEnv })
  return stdout.trim()
}

const startDeviceApp = async (app: DeviceApp) => {
  try {
    await launcher("stop")
    await launcher("start", app)
  } catch (error) {
    const stderr = String((error as { stderr?: string }).stderr ?? error)
    const reason = UNAVAILABLE.find((pattern) => pattern.test(stderr))
    test.skip(!!reason, `Ledger emulator unavailable: ${stderr.trim()}`)
    throw error
  }
}

const exchange = async (apdu: string) => {
  const response = await fetch(`${SPECULOS_API}/apdu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: apdu }),
  })
  const { data } = (await response.json()) as { data: string }
  expect(data.slice(-4), `status word of APDU ${apdu}`).toBe("9000")
  return Buffer.from(data.slice(0, -4), "hex")
}

const hardened = (index: number) => (index | 0x80000000) >>> 0

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
const base58 = (bytes: Uint8Array) => {
  let value = BigInt(`0x${Buffer.from(bytes).toString("hex")}`)
  let encoded = ""
  while (value > 0n) {
    encoded = BASE58_ALPHABET[Number(value % 58n)] + encoded
    value /= 58n
  }
  for (const byte of bytes) {
    if (byte !== 0) break
    encoded = `1${encoded}`
  }
  return encoded
}

/** Asks the device app for account 0 directly, the way each Ledger library does. */
const deviceAccountZero: Record<DeviceApp, () => Promise<string>> = {
  ethereum: () => launcher("eth-address", "0"),
  // @zondax/ledger-substrate generic app: GET_ADDR, ed25519, m/44'/354'/0'/0'/0', ss58 prefix 42
  polkadot: async () => {
    const path = Buffer.alloc(20)
    for (const [i, index] of [44, 354, 0, 0, 0].entries())
      path.writeUInt32LE(hardened(index), i * 4)
    const payload = Buffer.concat([path, Buffer.from([42, 0])])
    const response = await exchange(
      `f9010000${payload.length.toString(16).padStart(2, "0")}${payload.toString("hex")}`
    )
    return response.subarray(32).toString("ascii")
  },
  // @ledgerhq/hw-app-solana: GET_PUBKEY at the Ledger Live path m/44'/501'/0'
  solana: async () => {
    const payload = Buffer.alloc(13)
    payload[0] = 3
    for (const [i, index] of [44, 501, 0].entries())
      payload.writeUInt32BE(hardened(index), 1 + i * 4)
    const response = await exchange(
      `e0050000${payload.length.toString(16).padStart(2, "0")}${payload.toString("hex")}`
    )
    return base58(response.subarray(0, 32))
  },
}

const approveOnDevice = async () => {
  await expect
    .poll(() => launcher("screen"), { message: "the device shows a review", timeout: 15_000 })
    .toMatch(/Review|Sign/)
  await launcher("approve")
}

// Content scripts inject only on http(s) pages.
const DAPP_HTML = "<!DOCTYPE html><html><body><h1>Ledger emulator dapp</h1></body></html>"

const startDappServer = async () => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" })
    res.end(DAPP_HTML)
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address() as AddressInfo
  return { server, url: `http://127.0.0.1:${port}/` }
}

type EthereumWindow = Window & {
  talismanEth?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
  pending?: Promise<unknown>
}

const selectEmulator = async (page: Page, extensionId: string) => {
  await page.goto(`chrome-extension://${extensionId}/dashboard.html#/settings/general`)
  await page.getByRole("button", { name: "HID" }).click()
  await page.getByRole("option", { name: "Speculos (emulator)" }).click()
  await page.getByRole("button", { name: "Check" }).click()
  await expect(page.getByText("SPECULOS connection successful")).toBeVisible()
  await page.getByRole("button", { name: "Close" }).click()
}

const connectLedgerAccount = async (page: Page, extensionId: string, app: DeviceApp) => {
  await page.goto(`chrome-extension://${extensionId}/dashboard.html#/accounts/add/ledger`)
  const platform = app === "polkadot" ? "substrate" : app
  await page.getByTestId(`account-platform-selector-${platform}`).click()
  if (app === "polkadot") {
    await page.getByRole("button", { name: "Select a network" }).click()
    await page.getByRole("option", { name: "Polkadot", exact: true }).click()
    await page.getByRole("button", { name: /Polkadot App/ }).click()
  }
  await expect(page.getByText("Successfully connected to Ledger.")).toBeVisible()
  await page.getByRole("button", { name: "Continue" }).click()

  await page
    .getByRole("button", { name: /Ledger .* 1\b/ })
    .first()
    .click()
  await page.getByRole("button", { name: "Continue" }).click()

  await expect(page).toHaveURL(/#\/portfolio\b.*[?&]account=/, { timeout: 15_000 })
  return new URL(page.url().replace("#/", "")).searchParams.get("account")
}

test.describe("Ledger emulator", () => {
  // in order, in one worker, without skipping the other apps when one fails
  test.describe.configure({ mode: "default" })
  test.skip(
    process.env.E2E_LEDGER_EMULATOR !== "1",
    "set E2E_LEDGER_EMULATOR=1 to run against Speculos (docs/ledger-emulator.md)"
  )

  test.afterAll(async () => {
    await launcher("stop").catch(() => undefined)
  })

  for (const app of ["ethereum", "polkadot", "solana"] as const) {
    test(`connects account 0 of the ${app} app`, async ({ onboardedPage, extensionId }) => {
      await startDeviceApp(app)
      const expected = await deviceAccountZero[app]()

      await selectEmulator(onboardedPage, extensionId)
      const connected = await connectLedgerAccount(onboardedPage, extensionId, app)

      // Ethereum addresses differ only in their checksum casing
      const normalise = (address?: string | null) =>
        app === "ethereum" ? address?.toLowerCase() : address
      expect(normalise(connected)).toBe(normalise(expected))
    })
  }

  test("signs a personal message approved on the Ethereum app", async ({
    onboardedPage,
    extensionId,
    context,
  }) => {
    await startDeviceApp("ethereum")
    await selectEmulator(onboardedPage, extensionId)
    const address = await connectLedgerAccount(onboardedPage, extensionId, "ethereum")
    const message = Buffer.from("Talisman Ledger emulator e2e")

    const { server, url } = await startDappServer()
    try {
      const dapp = await context.newPage()
      await dapp.goto(url)
      await dapp.waitForFunction(() => !!(window as EthereumWindow).talismanEth)

      const [connectPopup] = await Promise.all([
        context.waitForEvent("page"),
        dapp.evaluate(() => {
          const w = window as EthereumWindow
          w.pending = w.talismanEth?.request({ method: "eth_requestAccounts" })
        }),
      ])
      await connectPopup.getByTestId("connection-connect-button").click()
      expect(await dapp.evaluate(() => (window as EthereumWindow).pending)).toEqual([
        address?.toLowerCase(),
      ])

      const [signPopup] = await Promise.all([
        context.waitForEvent("page"),
        dapp.evaluate(
          ({ address, messageHex }) => {
            const w = window as EthereumWindow
            w.pending = w.talismanEth?.request({
              method: "personal_sign",
              params: [messageHex, address],
            })
          },
          { address, messageHex: `0x${message.toString("hex")}` }
        ),
      ])
      // a fresh wallet first asks whether to turn on automatic risk assessments
      await signPopup.getByRole("button", { name: "No", exact: true }).click()
      await signPopup.getByRole("button", { name: "Sign on Ledger" }).click()
      await approveOnDevice()
      const signature = (await dapp.evaluate(() => (window as EthereumWindow).pending)) as string

      expect(signature).toMatch(/^0x[0-9a-fA-F]{130}$/)
      const signer = await recoverMessageAddress({
        message: { raw: `0x${message.toString("hex")}` },
        signature: signature as Hex,
      })
      expect(signer.toLowerCase()).toBe(address?.toLowerCase())
    } finally {
      server.close()
    }
  })
})
