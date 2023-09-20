import { Locator, Page } from "@playwright/test";
import Common from "./common";

export default class Portfolio extends Common {
    readonly ddlNetworkIcon: Locator
    readonly ddlNetworkInput: Locator
    readonly ddlExpandNetwork: Locator
    readonly ddlNetwork: Locator
    readonly assetList: Locator
    readonly assetIcon: Locator
    readonly headerCopyAddress: Locator
    readonly headerSend: Locator
    readonly networkIcon: Locator
    readonly networkName: Locator
    readonly networkCopyAddress: Locator

    constructor(readonly page: Page) {
        super(page)
        this.ddlNetworkIcon = page.locator('div > img[data-id]')
        this.ddlNetworkInput = page.locator('input[id^="headlessui-combobox-input"]')
        this.ddlExpandNetwork = page.locator('input[id^="headlessui-combobox-input"] ~ div > button')
        this.ddlNetwork = page.locator('ul[role="listbox"] > li')
        
        this.assetList = page.locator('div.text-body-secondary.text-left > button')
        this.assetIcon = this.assetList.locator('span > img')

        this.headerCopyAddress = page.locator('button:has-text("Asset") + div button:first-child')
        this.headerSend = page.locator('button:has-text("Asset") + div button:last-child')
        
        this.networkIcon = page.locator('div[class*="grid"] img')
        this.networkName = page.locator('div[class*="grid"] div.base > :first-child')
        this.networkCopyAddress = page.locator('div[class*="grid"] div.base > :nth-child(2)')
    }

    getNetwork = (networkName: string) => this.page.locator(`ul[role="listbox"] > li >> text="${networkName}"`)

    async waitForNetworks(maxRetries: number = 5) {
        if (!maxRetries) return null
        let currentCount = await this.assetList.count()
        await this.page.waitForTimeout(5000)
        if (currentCount < 1 || await this.assetList.count() > currentCount) {
            await this.waitForNetworks(maxRetries - 1)
        }
        return currentCount
    }
}