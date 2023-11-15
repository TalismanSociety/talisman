import { Locator, Page } from "@playwright/test"

export default class Common {
  constructor(readonly page: Page) {}

  getByRole(role: Parameters<Page["getByRole"]>[0], name = "", exact = false): Locator {
    return this.page.getByRole(role, { name, exact })
  }

  getByText(text: string, selector?: string): Locator {
    return selector ? this.page.locator(`${selector} >> text=${text}`) : this.page.getByText(text)
  }
}
