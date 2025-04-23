import type { BrowserContext, Page } from "@playwright/test"
import { test as base, chromium } from "@playwright/test"

import * as constants from "./constants"

type AccountType = "ethereum" | "polkadot"

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
  onboardedPage: Page
  addAccount: (opts: { type: AccountType; name?: string; mnemonic?: string }) => Promise<Page>
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, utilize) => {
    const pathToExtension = "./apps/extension/dist/chrome"
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    })
    await utilize(context)
    // await context.close(); // Uncomment if needed
  },
  //get the extension id
  extensionId: async ({ context }, utilize) => {
    let [background] = context.serviceWorkers()
    if (!background) background = await context.waitForEvent("serviceworker")

    const extensionId = background.url().split("/")[2]
    await utilize(extensionId)
  },
  //goes trough onboard flow and reach portfolio page using previsous browser context
  onboardedPage: async ({ context, extensionId }, utilize) => {
    const page = await context.newPage()

    await page.goto(`chrome-extension://${extensionId}/onboarding.html`)
    await page.waitForTimeout(1000)

    const pages = context.pages()
    for (const p of pages) {
      if (p !== page) await p.close()
    }

    await page.getByTestId("onboarding-get-started-button").click()
    await page.getByPlaceholder("Enter password").fill(constants.DEFAULT_PASSWORD)
    await page.getByPlaceholder("Confirm password").fill(constants.DEFAULT_PASSWORD)
    await page.getByTestId("onboarding-password-confirm-button").click()
    await page.getByTestId("onboarding-privacy-accept-button").click()
    await page.getByTestId("onboarding-enter-talisman-button").click()
    await utilize(page)
  },

  //add an account of the select type using both the Onboarded page and browser context which the exntenion is running
  addAccount: async ({ onboardedPage, extensionId }, utilize) => {
    const addAccount = async ({
      type,
      name,
      mnemonic,
    }: {
      type: "ethereum" | "polkadot"
      name?: string
      mnemonic?: string
    }) => {
      const page = onboardedPage
      const accName =
        name || (type === "ethereum" ? constants.ETH_ACC_NAME : constants.DOT_ACC_NAME)
      const seed =
        mnemonic ||
        (type === "ethereum" ? constants.ETH_TEST_MNEMONIC : constants.DOT_TEST_MNEMONIC)

      await page.goto(`chrome-extension://${extensionId}/dashboard.html#/accounts/add/mnemonic`)
      await page.getByTestId(`account-platform-selector-${type}`).click()
      await page.getByPlaceholder("Choose a name").fill(accName)
      await page.getByPlaceholder("Enter your 12 or 24 word recovery phrase").fill(seed)
      await page.waitForTimeout(1000)
      await page.getByTestId("account-add-mnemonic-import-button").click()
      return page
    }

    await utilize(addAccount)
  },
})
export const expect = test.expect
