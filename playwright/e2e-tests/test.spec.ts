import { expect, test } from "@playwright/test"

test("has title", async ({ page }) => {
  await page.goto("https://talisman.xyz")

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Talisman - An Ethereum and Polkadot wallet/)
})
