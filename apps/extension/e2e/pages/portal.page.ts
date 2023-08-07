import { Locator, Page } from "@playwright/test";
import Common from "./common.page";

export default class Portal extends Common {
    readonly allAccounts: Locator

    constructor(readonly page: Page) {
        super(page)
        this.allAccounts = page.locator('section.css-50tsth')
    }
}