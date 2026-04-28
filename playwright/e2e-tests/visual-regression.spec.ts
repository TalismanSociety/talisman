import { expect, test } from "./fixtures"

test("Visual Regression Test", async ({ onboardedPage, extensionId }) => {
  await onboardedPage.getByTestId("onboarding-toast-animated").click()
  await onboardedPage.emulateMedia({ reducedMotion: "reduce" })
  // Portfolio
  await expect(onboardedPage).toHaveScreenshot("portfolio.png", {
    maxDiffPixelRatio: 0.01,
  })
  // Accounts
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/accounts/add/`)
  await expect(onboardedPage).toHaveScreenshot("accounts-add.png", {
    maxDiffPixelRatio: 0.01,
  })
  // Accounts - ledger
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/accounts/add/ledger`)
  await onboardedPage.getByRole("button", { name: "Substrate" }).click()
  await onboardedPage.getByRole("button", { name: "Select a Network" }).click()
  await onboardedPage.getByRole("option", { name: "Polkadot", exact: true }).click()
  await onboardedPage.keyboard.press("End")
  await expect.soft(onboardedPage).toHaveScreenshot("accounts-ledger.png", {
    maxDiffPixelRatio: 0.01,
  })
  // Earn
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/earn/positions`)
  await expect.soft(onboardedPage).toHaveScreenshot("earn.png", {
    maxDiffPixelRatio: 0.01,
  })
  // Activity
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/tx-history`)
  await expect.soft(onboardedPage).toHaveScreenshot("activity.png", {
    maxDiffPixelRatio: 0.01,
  })
  // Settings
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/settings`)
  await expect.soft(onboardedPage).toHaveScreenshot("settings.png", { maxDiffPixelRatio: 0.01 })
  // Settings - Security & Privacy
  await onboardedPage.goto(
    `chrome-extension://${extensionId}/dashboard.html#/settings/security-privacy-settings`
  )
  await expect.soft(onboardedPage).toHaveScreenshot("settings-security-privacy.png", {
    maxDiffPixelRatio: 0.01,
  })
  // Settings - Networks & Tokens
  await onboardedPage.goto(
    `chrome-extension://${extensionId}/dashboard.html#/settings/networks-tokens`
  )
  await expect.soft(onboardedPage).toHaveScreenshot("settings-network-tokens.png", {
    maxDiffPixelRatio: 0.01,
  })
})
