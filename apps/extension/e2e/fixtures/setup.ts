import { BrowserContext, Page, test as base, chromium } from '@playwright/test'
import Common from '../pages/common.page'
import Onboarding from '../pages/onboarding.page'
import Settings from '../pages/settings.page'

export const test = base.extend<{
    context: BrowserContext
    page: Page
    appPage: Page
    common: Common
    onboarding: Onboarding
    settings: Settings
}>({
    context: async ({}, use) => {
        const extPath = require('path').join(__dirname, '../../dist/')
        const context = await chromium.launchPersistentContext('', {
            args: [
                `--disable-extensions-except=${extPath}`,
                `--load-extension=${extPath}`
            ]
        })
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])
        await Promise.all([
            context.waitForEvent('page'),
            context.backgroundPages()[0]
        ])
        await context.pages()[0].close()
        await use(context)
    },
    page: async ({context}, use) => {
        await use(context.pages()[0])
    },
    appPage: async ({context}, use) => {
        await use(await context.newPage())
    },
    common: async ({page}, use) => {
        await use(new Common(page))
    },
    onboarding: async ({page}, use) => {
        await use(new Onboarding(page))
    },
    settings: async ({page}, use) => {
        await use(new Settings(page))
    },
})

export default test
export const expect = base.expect