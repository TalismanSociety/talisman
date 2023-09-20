import { Locator, Page } from "@playwright/test";

export default class Common {
    
    constructor(readonly page: Page) { }

    getByRole(role: any, name?: string, exact?: boolean): Locator {
        return this.page.getByRole(role, { name:  name || '', exact: exact || false})
    }

    getByText(text: string, selector?: string): Locator {
        return selector ? this.page.locator(`${selector} >> text=${text}`) : this.page.getByText(text)
    }
}