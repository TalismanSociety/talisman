import path from "path"

import { BrowserContext, Page, test as base, chromium } from "@playwright/test"

import Common from "../pages/common"
import Modal from "../pages/modal"
import Onboarding from "../pages/onboarding"
import Portfolio from "../pages/portfolio"
import Settings from "../pages/settings"

const extPath = path.join(__dirname, "../../apps/extension/dist")

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
  extensionUrl: string
  backgroundPage: Page
  page: Page
  appPage: Page
  common: Common
  onboarding: Onboarding
  portfolio: Portfolio
  modal: Modal
  settings: Settings
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
    })
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    try {
      await context.waitForEvent("page")
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Project may not be built in /dist folder", { cause: e })
    }
    await use(context)
    await context.close()
  },
  backgroundPage: async ({ context }, use) => {
    let [background] = context.backgroundPages()
    if (!background) background = await context.waitForEvent("backgroundpage")
    await use(background)
  },
  extensionId: async ({ backgroundPage }, use) => {
    const extensionId = backgroundPage.url().split("/")[2]
    await use(extensionId)
  },
  extensionUrl: async ({ extensionId }, use) => {
    await use(`chrome-extension://${extensionId}`)
  },
  page: async ({ context }, use) => {
    await use(context.pages().filter((p) => p.url().startsWith("chrome-extension://"))[0])
  },
  appPage: async ({ context }, use) => {
    await use(await context.newPage())
  },
  common: async ({ page }, use) => {
    await use(new Common(page))
  },
  onboarding: async ({ page }, use) => {
    await use(new Onboarding(page))
  },
  portfolio: async ({ page }, use) => {
    await use(new Portfolio(page))
  },
  modal: async ({ page }, use) => {
    await use(new Modal(page))
  },
  settings: async ({ page }, use) => {
    await use(new Settings(page))
  },
})

export default test
export const expect = base.expect
