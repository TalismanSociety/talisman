import { existsSync } from "node:fs"

import { randomBytes } from "@noble/hashes/utils"
import type { BrowserContext, Locator, Page } from "@playwright/test"
import { test as base, chromium } from "@playwright/test"
import { xxhashAsHex } from "@polkadot/util-crypto"

type AccountType = "ethereum" | "substrate" | "solana"
type WatchedAccountType = "ethereum" | "substrate" | "solana"
type PrivateKeyAccountType = "ethereum" | "solana"

const randomName = (prefix: string) => {
  const suffix = xxhashAsHex(randomBytes(16)).slice("0x".length, "0x".length + 3)
  return `${prefix} (${suffix})`
}

// Default values if nothing gets defined
export const DEFAULT_PASSWORD = "talismanwallet"
const DEFAULT_TEST_MNEMONIC = "test test test test test test test test test test test junk"

export const ethDevChain = "http://localhost:8545"

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
  onboardedPage: Page
  importAccount: (opts: { type: AccountType; name?: string; mnemonic?: string }) => Promise<Page>
  addNewAccount: (opts: { type: AccountType; name?: string }) => Promise<Page>
  addWatchedAccount: (opts: {
    type: WatchedAccountType
    address: string
    name?: string
  }) => Promise<Page>
  importPrivateKey: (opts: {
    type: PrivateKeyAccountType
    privateKey: string
    name?: string
  }) => Promise<Page>
  walletPopup: (opts: { locator: Locator }) => Promise<Page>
  useDevChains: () => Promise<void>
}>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures require destructuring pattern
  context: async ({}, utilize) => {
    const prodPath = "./apps/extension/dist/chrome-mv3"
    const devPath = "./apps/extension/dist/chrome-mv3-dev"
    const pathToExtension = existsSync(prodPath) ? prodPath : devPath
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    })

    context.on("weberror", (err) => {
      throw new Error(`Failing test due to error in browser context: ${err.error()}`)
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
      throw new Error(`Failing test due to error in browser page: ${err}`)
    })

    await page.goto(`chrome-extension://${extensionId}/onboarding.html`)
    await page.waitForTimeout(1000)

    const pages = context.pages()
    for (const p of pages) {
      if (p !== page) await p.close()
    }

    await page.getByTestId("onboarding-get-started-button").click()
    // Password validation
    await page.getByPlaceholder("Enter password").fill("12345")
    await expect(page.getByText("Password must be at least 6 characters long")).toBeVisible()
    await page.getByPlaceholder("Enter password").fill(DEFAULT_PASSWORD)
    await page.getByPlaceholder("Confirm password").fill("wrong-confirmation-password")
    await expect(page.getByText("Passwords must match")).toBeVisible()
    await expect(page.getByTestId("onboarding-password-confirm-button")).toBeDisabled()
    await page.getByPlaceholder("Confirm password").fill(DEFAULT_PASSWORD)
    await page.getByTestId("onboarding-password-confirm-button").click()
    // accepting privacy terms
    await page.getByTestId("onboarding-privacy-accept-button").click()
    // Enter Talisman
    await page.getByTestId("onboarding-enter-talisman-button").click()
    await expect(page.getByTestId("section-get-started")).toBeVisible({ timeout: 5000 })
    await utilize(page)
  },

  // add an account of the select type using both the onboarded page and browser context which the extension is running
  importAccount: async ({ onboardedPage, extensionId }, utilize) => {
    const importAccount = async ({
      type,
      name,
      mnemonic,
    }: {
      type: "ethereum" | "substrate" | "solana"
      name?: string
      mnemonic?: string
    }) => {
      const defaultNames: Record<AccountType, string> = {
        ethereum: randomName("PW e2e - ETH"),
        substrate: randomName("PW e2e - DOT"),
        solana: randomName("PW e2e - SOL"),
      }
      const accName = name || defaultNames[type]
      const seed = mnemonic || process.env.E2E_TESTS_MNEMONIC || DEFAULT_TEST_MNEMONIC
      await onboardedPage.goto(
        `chrome-extension://${extensionId}/dashboard.html#/accounts/add/mnemonic`
      )
      await onboardedPage.getByTestId(`account-platform-selector-${type}`).click()

      const nameInput = onboardedPage.getByPlaceholder("Choose a name")
      const mnemonicInput = onboardedPage.getByPlaceholder(
        "Enter your 12 or 24 word recovery phrase"
      )
      const importButton = onboardedPage.getByTestId("account-add-mnemonic-import-button")

      await nameInput.fill(accName)

      const mnemonicError = onboardedPage.getByTestId("mnemonic-error-message")

      // Try to submit a short seed phrase
      await mnemonicInput.fill("test test test")
      await expect(mnemonicError).toHaveText("Invalid recovery phrase")
      await expect(importButton).toBeDisabled()

      // Try to submit an invalid seed phrase
      await mnemonicInput.fill("aaa bbb ccc ddd eee fff ggg hhh iii jjj kkk lll")
      await expect(mnemonicError).toHaveText("Invalid recovery phrase")
      await expect(importButton).toBeDisabled()

      // Try to submit a very long seed phrase
      await mnemonicInput.fill(
        "test test test test test test test test test test test test test test test test test test test test test test test test test"
      )
      await expect(mnemonicError).toHaveText("Invalid recovery phrase")
      await expect(importButton).toBeDisabled()

      // Try to submit a valid seed phrase
      await mnemonicInput.fill(seed)
      await expect(importButton).toBeEnabled()
      await importButton.click()
      await expect(onboardedPage.getByTestId("top-actions-buttons")).toBeVisible()
      expect(onboardedPage.url()).toContain("portfolio")
      return onboardedPage
    }
    await utilize(importAccount)
  },
  addNewAccount: async ({ onboardedPage, extensionId }, utilize) => {
    const addNewAccount = async ({
      type,
      name,
    }: {
      type: "ethereum" | "substrate" | "solana"
      name?: string
    }) => {
      const accName = name || randomName("PW - E2E - Fresh")

      const platformMap: Record<AccountType, string> = {
        substrate: "polkadot",
        ethereum: "ethereum",
        solana: "solana",
      }
      const convertedType = platformMap[type]

      await onboardedPage.goto(
        `chrome-extension://${extensionId}/dashboard.html#/accounts/add/derived?platform=${convertedType}`
      )
      await onboardedPage.getByPlaceholder("Choose a name").fill(accName)

      const addAccountButton = onboardedPage.getByTestId("account-add-new-account-button")
      const mnemonicDropdown = onboardedPage.getByTestId("account-add-mnemonic-dropdown")

      if (await mnemonicDropdown.isVisible()) {
        await mnemonicDropdown.click()
        await onboardedPage
          .locator('[role="option"]:has-text("Generate new recovery phrase")')
          .click()
        await addAccountButton.click()
      } else {
        await addAccountButton.click()
      }
      await expect(onboardedPage.getByTestId("mnemonic-acknowledge-button")).toBeEnabled()
      await onboardedPage.getByTestId("mnemonic-acknowledge-button").click()
      await expect(onboardedPage.getByTestId("mnemonic-skip-verification-button")).toBeEnabled()
      await onboardedPage.getByTestId("mnemonic-skip-verification-button").click()
      await expect(onboardedPage.getByTestId("top-actions-buttons")).toBeVisible()
      expect(onboardedPage.url()).toContain("portfolio")
      return onboardedPage
    }
    await utilize(addNewAccount)
  },
  addWatchedAccount: async ({ onboardedPage, extensionId }, utilize) => {
    const addWatchedAccount = async ({
      type,
      address,
      name,
    }: {
      type: WatchedAccountType
      address: string
      name?: string
    }) => {
      const accName = name || address

      await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/accounts/add/`)
      await onboardedPage
        .getByTestId("container-account-method")
        .getByText("Add a Watched Account")
        .click()
      await onboardedPage.getByRole("button", { name: `Watch ${type} Account` }).click()
      await onboardedPage.getByPlaceholder("Choose a name").fill(accName)
      await onboardedPage.getByPlaceholder("Enter wallet address").fill(address)

      const addButton = onboardedPage.getByTestId("account-add-watched-button")
      await expect(addButton).toBeEnabled()
      await addButton.click()

      await expect(onboardedPage.getByTestId("top-actions-buttons")).toBeVisible()
      expect(onboardedPage.url()).toContain("portfolio")
      return onboardedPage
    }
    await utilize(addWatchedAccount)
  },
  importPrivateKey: async ({ onboardedPage, extensionId }, utilize) => {
    const importPrivateKey = async ({
      type,
      privateKey,
      name,
    }: {
      type: PrivateKeyAccountType
      privateKey: string
      name?: string
    }) => {
      const accName = name || randomName("PW - PrivKey")

      await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/accounts/add/pk`)

      await onboardedPage.getByText("Select account platform").click()
      const platformLabel = type === "ethereum" ? "Ethereum" : "Solana"
      await onboardedPage.getByTestId("private-key-add-form").getByText(platformLabel).click()

      await onboardedPage.getByPlaceholder("Choose a name").fill(accName)
      await onboardedPage.getByPlaceholder("Enter your private key").fill(privateKey)

      const saveButton = onboardedPage.getByRole("button", { name: "Save" })
      await expect(saveButton).toBeEnabled()
      await saveButton.click()

      await expect(onboardedPage.getByTestId("top-actions-buttons")).toBeVisible()
      expect(onboardedPage.url()).toContain("portfolio")
      return onboardedPage
    }
    await utilize(importPrivateKey)
  },
  walletPopup: async ({ context }, utilize) => {
    const walletPopup = async ({ locator }: { locator: Locator }): Promise<Page> => {
      const [popup] = await Promise.all([context.waitForEvent("page"), locator.click()])
      // opens wallet popup
      await popup.waitForTimeout(5000)
      await popup.bringToFront()
      await popup.setViewportSize({ width: 400, height: 600 })
      return popup
    }
    await utilize(walletPopup)
  },
  useDevChains: async ({ onboardedPage, extensionId }, utilize) => {
    const useDevChains = async () => {
      // disables all other networks
      await onboardedPage.goto(
        `chrome-extension://${extensionId}/dashboard.html#/settings/networks-tokens/networks/`
      )
      await onboardedPage.getByRole("button", { name: "Deactivate all" }).click()
      await expect(
        onboardedPage.getByTestId("network-list-deactivate-confirm-button")
      ).toBeVisible()
      await onboardedPage.getByTestId("network-list-deactivate-confirm-button").click()
      // access ethereum mainnet page
      await onboardedPage.goto(
        `chrome-extension://${extensionId}/dashboard.html#/settings/networks-tokens/network/1`
      )
      // deletes all other rpcs
      const deleteButtons = onboardedPage.getByTestId("network-rpcs-delete-button")

      const count = await deleteButtons.count()
      for (let i = count - 1; i >= 1; i--) {
        await deleteButtons.nth(i).click()
      }
      // fills input with ethereum devchain RPC
      await onboardedPage.getByTestId("form-field-input-rpc").fill(ethDevChain)
      await expect(onboardedPage.getByRole("button", { name: "Save" })).toBeEnabled()
      await onboardedPage.getByRole("button", { name: "Save" }).click()
    }
    await utilize(useDevChains)
  },
})
export const expect = test.expect
