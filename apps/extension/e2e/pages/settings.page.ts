import { Locator, Page } from "@playwright/test";
import Common from "./common.page";

export default class Settings extends Common {
    readonly inputPassword: Locator
    readonly btnViewPhrase: Locator
    readonly textPhrase: Locator
    readonly btnToggle: Locator
    readonly iconClosePopup: Locator
    readonly textAccountCount: Locator
    readonly inputName: Locator
    readonly inputAddress: Locator
    readonly textTestnet: Locator
    readonly inputOldPwd: Locator
    readonly inputNewPwd: Locator
    readonly inputConfirmPwd: Locator
    readonly textPwdError: Locator

    constructor(readonly page: Page) {
        super(page)
        this.inputPassword = page.locator('input[name="password"]')
        this.btnViewPhrase = page.locator('button[type="submit"]')
        this.textPhrase = page.locator('span.bg-black-tertiary')
        this.btnToggle = page.locator('label div')
        this.iconClosePopup = page.locator('header button')
        this.textAccountCount = page.locator('div.text-primary.mr-3')
        this.inputName = page.locator('input[name="name"]')
        this.inputAddress = page.locator('input[name="address"]')
        this.textTestnet = page.locator('div.text-alert-warn')
        this.inputOldPwd = page.locator('input[name="currentPw"]')
        this.inputNewPwd = page.locator('input[name="newPw"]')
        this.inputConfirmPwd = page.locator('input[name="newPwConfirm"]')
        this.textPwdError = page.locator('div.text-alert-warn')
    }
}