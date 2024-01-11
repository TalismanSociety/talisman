import { Locator, Page } from "@playwright/test";
import Common from "./common";

export default class Modal extends Common {
    readonly copyAddress: Locator
    readonly inputSearch: Locator
    readonly listItem: Locator
    readonly accountButton: Locator
    readonly networkButton: Locator
    readonly network: Locator
    readonly address: Locator

    constructor(readonly page: Page) {
        super(page)
        this.copyAddress = page.locator('#copy-address-modal').or(page.locator('#main'))
        this.inputSearch = this.copyAddress.locator('input')
        this.listItem = this.copyAddress.locator('button > div:nth-child(2)')
        this.accountButton = this.copyAddress.locator('div:has-text("Account") + div > button')
        this.networkButton = this.copyAddress.locator('div:has-text("Network") + div > button')
        this.network = this.copyAddress.locator('span[class="text-body"]')
        this.address = this.copyAddress.locator('div[class="leading-none"]')
    }

    getNetwork = (networkName: string) => this.page.locator(`ul[role="listbox"] > li >> text="${networkName}"`)
}