import { DOT_ACC_NAME, ETH_ACC_NAME } from "./constants"
import { expect, test } from "./fixtures"
import { testAssets } from "./transfers"

test("Transfer Assets", async ({ importAccount, onboardedPage, walletPopup, extensionId }) => {
  test.setTimeout(120_000)
  await importAccount({ type: "polkadot", name: DOT_ACC_NAME })
  await importAccount({ type: "ethereum", name: ETH_ACC_NAME })
  await onboardedPage.goto(
    `chrome-extension://${extensionId}/dashboard.html#/settings/networks-tokens/networks`,
  )
  // enables testnet networks
  for (const data of testAssets) {
    if (data.needsEnabling == true) {
      await test.step(`Enabling ${data.chain}`, async () => {
        await onboardedPage.getByTestId("platform-options-switch").getByText(data.chainType).click()
        const searchParameter = data.chain.replace(/\s*\(.*?\)\s*/g, "").trim()
        await onboardedPage.getByPlaceholder("Search Networks").fill(searchParameter)
        const firstResult = onboardedPage.getByTestId("network-list-row").first()
        await expect(firstResult).toContainText(data.chain)
        await firstResult.getByTestId("component-toggle-button").first().click()
        await onboardedPage.getByTestId("platform-options-switch").getByText("all").click()
      })
    }
  }
  // goes back to portfolio page and select the created account
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/portfolio/tokens`)
  // stores send button
  const sendButton = onboardedPage
    .getByTestId("top-actions-buttons")
    .getByRole("button", { name: "Send" })
  // starts transfering assets
  for (const data of testAssets) {
    await test.step(`Transferring ${data.assetName} on ${data.chain}`, async () => {
      if (data.chainType === "polkadot") {
        await onboardedPage.getByTestId("sidebar-account-list").getByText(DOT_ACC_NAME).click()
      } else {
        await onboardedPage.getByTestId("sidebar-account-list").getByText(ETH_ACC_NAME).click()
      }
      const popup = await walletPopup({ locator: sendButton })
      // searches for the specific token by asset name, type and chain.
      const result = popup
        .locator('[data-testid="token-picker-row"]')
        .filter({
          has: popup.getByTestId("picker-token-name").filter({ hasText: data.assetName }),
        })
        .filter({
          has: popup.getByTestId("component-token-pill").filter({ hasText: data.tokenType }),
        })
        .filter({
          has: popup.getByTestId("picker-token-network").filter({ hasText: data.chain }),
        })
      await expect(result).toBeVisible({ timeout: 30000 })
      await result.first().click()
      await popup.getByPlaceholder("Enter Address").fill(data.sendTo)
      await popup.keyboard.press("Enter")
      await popup.getByPlaceholder("0").fill(data.amount)
      await expect(popup.getByTestId("component-review-button")).toBeEnabled({ timeout: 10000 })
      await popup.getByTestId("component-review-button").click()
      await expect(popup.getByTestId("send-funds-confirm-button").getByRole("button")).toBeEnabled()
      await popup.getByTestId("send-funds-confirm-button").click()
      await expect(popup.getByRole("button", { name: "Close" })).toBeVisible()
      await popup.close()
    })
  }
  // check for transaction status on activity tab
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/tx-history`)
  const transactionCount = testAssets.length
  for (let i = 0; i < transactionCount; i++) {
    await expect(onboardedPage.getByTestId("tx-history-row-transaction").nth(i)).toContainText(
      "Confirmed",
      { timeout: 30000 },
    )
  }
})
