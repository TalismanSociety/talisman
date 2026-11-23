import { createServer } from "node:http"
import type { AddressInfo } from "node:net"

import type { BrowserContext, Page } from "@playwright/test"

import { test as base, expect } from "../fixtures"
import {
  approveOnDevice,
  type DeviceApp,
  launcher,
  rejectOnDevice,
  restartDeviceApp,
  startDeviceApp,
} from "./emulator"

/** A request of the test dapp to the wallet's injected provider. */
export type DappCall = { method: string; params: unknown }

export type LedgerDappWindow = Window & {
  ledgerDapp?: {
    connect: () => Promise<string[]>
    send: (call: DappCall) => Promise<unknown>
  }
  pending?: Promise<unknown>
}

/** A wallet with account 0 of the device app, and a dapp page connected to that account. */
export type Session = { address: string; context: BrowserContext; dapp: Page }

export type SigningCase = {
  name: string
  /** A fresh wallet first asks whether to turn on automatic risk assessments for such a request. */
  asksRiskAssessment?: boolean
  /** Sets up what the request needs: a device setting, a chain. */
  prepare?: (session: Session) => Promise<void>
  /** What the dapp asks the wallet to sign. */
  request: (session: Session) => DappCall | Promise<DappCall>
  /** Throws unless the result verifies against the account's address or public key. */
  verify: (result: unknown, call: DappCall, session: Session) => void | Promise<void>
}

export type ErrorCase = {
  name: string
  /** The request that fails. Defaults to the app's `errorSigning`. */
  signing?: SigningCase
  /** Makes the failure happen. `sign` clicks "Sign on Ledger". */
  cause: (sign: () => Promise<void>) => Promise<void>
  /** The error the wallet shows. */
  message: string
  /** Puts the device back into a state that can sign. */
  recover?: () => Promise<void>
}

export type DeviceAppSuite = {
  app: DeviceApp
  /** Asks the device app for account 0 directly, the way its Ledger library does. */
  deviceAccountZero: () => Promise<string>
  /**
   * Runs in the dapp page until it returns true: sets `window.ledgerDapp` once the wallet's
   * provider is injected.
   */
  installDapp: () => boolean
  /** The connect popup of the Ethereum provider has the only account selected already. */
  connectPreselectsAccount?: boolean
  signing: SigningCase[]
  /** The request of the error cases that do not bring their own. */
  errorSigning: SigningCase
  errors: ErrorCase[]
}

export const rejectedOnDevice: ErrorCase = {
  name: "the request is rejected on the device",
  cause: async (sign) => {
    await sign()
    await rejectOnDevice()
  },
  message: "Transaction was rejected by the Ledger device.",
}

const APP_NAME: Record<DeviceApp, string> = {
  ethereum: "Ethereum",
  polkadot: "Polkadot",
  solana: "Solana",
}

export const wrongAppOpen = (app: DeviceApp, openApp: DeviceApp): ErrorCase => ({
  name: `the ${APP_NAME[openApp]} app is open on the device`,
  cause: async (sign) => {
    await restartDeviceApp(openApp)
    await sign()
  },
  message: `Please open ${APP_NAME[app]} app on your Ledger.`,
  recover: () => restartDeviceApp(app),
})

export const emulatorStopped = (app: DeviceApp): ErrorCase => ({
  name: "the emulator is stopped before the request reaches it",
  cause: async (sign) => {
    await launcher("stop")
    await sign()
  },
  message: "Could not connect to the Ledger emulator",
  recover: () => startDeviceApp(app),
})

// Content scripts inject only on http(s) pages.
const DAPP_HTML = "<!DOCTYPE html><html><body><h1>Ledger emulator dapp</h1></body></html>"

const test = base.extend<Record<never, never>, { dappUrl: string }>({
  dappUrl: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures require destructuring pattern
    async ({}, utilize) => {
      const server = createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(DAPP_HTML)
      })
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
      const { port } = server.address() as AddressInfo
      await utilize(`http://127.0.0.1:${port}/`)
      server.close()
    },
    { scope: "worker" },
  ],
})

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
  const address = new URL(page.url().replace("#/", "")).searchParams.get("account")
  if (!address) throw new Error(`no account in ${page.url()}`)
  return address
}

/** Sends the call from the dapp and returns the wallet popup it opens. */
export const requestFromDapp = async ({ context, dapp }: Session, call: DappCall) => {
  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    dapp.evaluate((call) => {
      const w = window as LedgerDappWindow
      w.pending = w.ledgerDapp?.send(call)
    }, call),
  ])
  return popup
}

export const dappResult = (dapp: Page) => dapp.evaluate(() => (window as LedgerDappWindow).pending)

// Ethereum addresses differ only in their checksum casing
const sameAddress = (a: string, b: string) => a === b || a.toLowerCase() === b.toLowerCase()

/** Registers the tests of one device app: connect account 0, each signing case, each error case. */
export const ledgerSuite = (suite: DeviceAppSuite) => {
  const { app } = suite

  type Fixtures = { onboardedPage: Page; extensionId: string; context: BrowserContext }

  const connectAccount = async ({ onboardedPage, extensionId }: Fixtures) => {
    await startDeviceApp(app)
    await selectEmulator(onboardedPage, extensionId)
    return connectLedgerAccount(onboardedPage, extensionId, app)
  }

  const openSession = async (fixtures: Fixtures, dappUrl: string): Promise<Session> => {
    const address = await connectAccount(fixtures)
    const { context } = fixtures
    const dapp = await context.newPage()
    await dapp.goto(dappUrl)
    await dapp.waitForFunction(suite.installDapp)

    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      dapp.evaluate(() => {
        const w = window as LedgerDappWindow
        w.pending = w.ledgerDapp?.connect()
      }),
    ])
    if (!suite.connectPreselectsAccount)
      await popup.getByRole("button", { name: /^Ledger \w+ 1$/ }).click()
    await popup.getByTestId("connection-connect-button").click()
    const [connected] = (await dappResult(dapp)) as string[]
    expect(sameAddress(connected, address), `the dapp is connected to ${address}`).toBe(true)

    return { address, context, dapp }
  }

  /** Opens the sign popup of the case. `sign` clicks "Sign on Ledger", `finish` verifies the result. */
  const openSignRequest = async (session: Session, signing: SigningCase) => {
    await signing.prepare?.(session)
    const call = await signing.request(session)
    const popup = await requestFromDapp(session, call)
    if (signing.asksRiskAssessment)
      await popup.getByRole("button", { name: "No", exact: true }).click()
    return {
      popup,
      sign: () => popup.getByRole("button", { name: "Sign on Ledger" }).click(),
      finish: async () => signing.verify(await dappResult(session.dapp), call, session),
    }
  }

  test.describe(`Ledger ${app} app`, () => {
    // in order, in one worker, without skipping the other cases when one fails
    test.describe.configure({ mode: "default" })
    test.skip(
      process.env.E2E_LEDGER_EMULATOR !== "1",
      "set E2E_LEDGER_EMULATOR=1 to run against Speculos (docs/ledger-emulator.md)"
    )

    // biome-ignore lint/correctness/noEmptyPattern: Playwright hooks require destructuring pattern
    test.afterEach(async ({}, testInfo) => {
      // a failed test can leave a review open on the device, which the next test would inherit
      if (testInfo.status !== testInfo.expectedStatus) await launcher("stop").catch(() => undefined)
    })

    test.afterAll(async () => {
      await launcher("stop").catch(() => undefined)
    })

    test("connects account 0", async ({ onboardedPage, extensionId, context }) => {
      // asked before the wallet connects: Speculos mixes up the answers of two concurrent clients
      await startDeviceApp(app)
      const expected = await suite.deviceAccountZero()
      const connected = await connectAccount({ onboardedPage, extensionId, context })
      expect(sameAddress(connected, expected), `${connected} is the device's ${expected}`).toBe(
        true
      )
    })

    for (const signing of suite.signing) {
      test(`signs ${signing.name}`, async ({ onboardedPage, extensionId, context, dappUrl }) => {
        const session = await openSession({ onboardedPage, extensionId, context }, dappUrl)
        const { sign, finish } = await openSignRequest(session, signing)
        await sign()
        await approveOnDevice()
        await finish()
      })
    }

    for (const error of suite.errors) {
      test(`shows the error and signs on retry when ${error.name}`, async ({
        onboardedPage,
        extensionId,
        context,
        dappUrl,
      }) => {
        const session = await openSession({ onboardedPage, extensionId, context }, dappUrl)
        const { popup, sign, finish } = await openSignRequest(
          session,
          error.signing ?? suite.errorSigning
        )

        await error.cause(sign)
        await expect(popup.getByText(error.message)).toBeVisible()
        await popup.getByRole("button", { name: "Close" }).click()

        await error.recover?.()
        await sign()
        await approveOnDevice()
        await finish()
      })
    }
  })
}
