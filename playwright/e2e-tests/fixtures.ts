import type { BrowserContext, Page } from "@playwright/test"
import { randomBytes } from "@noble/hashes/utils"
import { test as base, chromium } from "@playwright/test"
import { xxhashAsHex } from "@polkadot/util-crypto"

import * as constants from "./constants"

type AccountType = "ethereum" | "polkadot"

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
  onboardedPage: Page
  importAccount: (opts: { type: AccountType; name?: string; mnemonic?: string }) => Promise<Page>
  addNewAccount: (opts: { type: AccountType; name?: string }) => Promise<Page>
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

    context.on("weberror", (err) => {
      throw new Error("Failing test due to error in browser context: " + err.error())
    })

    await utilize(context)
  },
  // get the extension id
  extensionId: async ({ context }, utilize) => {
    let [background] = context.serviceWorkers()
    if (!background) background = await context.waitForEvent("serviceworker")

    const extensionId = background.url().split("/")[2]
    await utilize(extensionId)
  },
  // goes through onboard flow and reach portfolio page using previous browser context
  onboardedPage: async ({ context, extensionId }, utilize) => {
    const page = await context.newPage()

    page.on("pageerror", (err) => {
      throw new Error("Failing test due to error in browser page: " + err)
    })

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

  // add an account of the select type using both the onboarded page and browser context which the extension is running
  importAccount: async ({ onboardedPage, extensionId }, utilize) => {
    const importAccount = async ({
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
      await page.waitForTimeout(1000)
      return page
    }

    await utilize(importAccount)
  },
  addNewAccount: async ({ onboardedPage, extensionId }, utilize) => {
    const addNewAccount = async ({
      type,
      name,
    }: {
      type: "ethereum" | "polkadot"
      name?: string
    }) => {
      const page = onboardedPage
      // randomize the name of the account if not provided
      const suffixLength = 3
      const randomBuffer = randomBytes(16)
      const getRandomChars = xxhashAsHex(randomBuffer).slice(
        "0x".length,
        "0x".length + suffixLength,
      )
      const accName = name || constants.NEW_ACC_NAME + " " + `(${getRandomChars})`

      await page.goto(
        `chrome-extension://${extensionId}/dashboard.html#/accounts/add/derived?platform=${type}`,
      )
      await page.getByPlaceholder("Choose a name").fill(accName)

      const addAccountButton = page.getByTestId("account-add-new-account-button")
      const mnemonicDropdown = page.getByTestId("account-add-mnemonic-dropdown")

      if (await mnemonicDropdown.isVisible()) {
        await mnemonicDropdown.click()
        await page.locator('[role="option"]:has-text("Generate new recovery phrase")').click()
        await addAccountButton.click()
      } else {
        await addAccountButton.click()
      }

      await page.getByTestId("mnemonic-acknowledge-button").click()
      await page.waitForTimeout(1000)
      await page.getByTestId("mnemonic-skip-verification-button").click()
      await page.waitForTimeout(1000)
      return page
    }

    await utilize(addNewAccount)
  },
})
export const expect = test.expect
