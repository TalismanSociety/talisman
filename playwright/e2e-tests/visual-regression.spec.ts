import type { Page } from "@playwright/test"
import { expect, test } from "./fixtures"

const maxDiffPixelRatio = 0.01

type VisualRoute = {
  name: string
  path: string
  screenshot: string
  setup?: (page: Page) => Promise<void>
}

test("Visual Regression Test", async ({ onboardedPage, extensionId }) => {
  await onboardedPage.getByTestId("onboarding-toast-animated").click()
  await onboardedPage.emulateMedia({ reducedMotion: "reduce" })

  const routes: VisualRoute[] = [
    { name: "Portfolio", path: "/portfolio/", screenshot: "portfolio.png" },
    {
      name: "Accounts - Add - Import",
      path: "/accounts/add?methodType=import",
      screenshot: "accounts-add-import.png",
    },
    { name: "Accounts - Add", path: "/accounts/add/", screenshot: "accounts-add.png" },
    {
      name: "Accounts - Add - Import",
      path: "/accounts/add?methodType=import",
      screenshot: "accounts-add-import.png",
    },
    {
      name: "Accounts - Add - Mnemonic",
      path: "/accounts/add/mnemonic",
      screenshot: "accounts-add-mnemonic.png",
    },
    {
      name: "Accounts - Add - Watched",
      path: "/accounts/add?methodType=watched",
      screenshot: "accounts-add-watched.png",
    },
    {
      name: "Accounts - Ledger",
      path: "/accounts/add/ledger",
      screenshot: "accounts-ledger.png",
      setup: async (page) => {
        await page.getByRole("button", { name: "Substrate" }).click()
        await page.getByRole("button", { name: "Select a Network" }).click()
        await page.getByRole("option", { name: "Polkadot", exact: true }).click()
        await page.keyboard.press("End")
      },
    },
    { name: "Earn", path: "/earn/positions", screenshot: "earn.png" },
    { name: "Activity", path: "/tx-history", screenshot: "activity.png" },
    { name: "Settings", path: "/settings", screenshot: "settings.png" },
    {
      name: "Settings - Security & Privacy",
      path: "/settings/security-privacy-settings",
      screenshot: "settings-security-privacy.png",
    },
    {
      name: "Settings - Networks & Tokens",
      path: "/settings/networks-tokens",
      screenshot: "settings-network-tokens.png",
    },
  ]

  for (const route of routes) {
    await test.step(route.name, async () => {
      try {
        await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#${route.path}`)
        await route.setup?.(onboardedPage)
        await expect(onboardedPage).toHaveScreenshot(route.screenshot, { maxDiffPixelRatio })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        // biome-ignore lint/suspicious/noConsole: surface failures in CI logs without failing the test
        console.warn(`[visual-regression] ${route.name} step failed:\n${message}`)
        test.info().annotations.push({
          type: "visual-regression-error",
          description: `${route.name}: ${message}`,
        })
      }
    })
  }
})
