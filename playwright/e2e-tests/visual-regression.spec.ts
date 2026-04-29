import { expect, test } from "./fixtures"

const maxDiffPixelRatio = 0.3

test("Visual Regression Test", async ({ onboardedPage, extensionId }) => {
  await onboardedPage.getByTestId("onboarding-toast-animated").click()
  await onboardedPage.emulateMedia({ reducedMotion: "reduce" })
  // Portfolio
  await expect(onboardedPage).toHaveScreenshot("portfolio.png", { maxDiffPixelRatio })
  // Accounts
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/accounts/add/`)
  await expect(onboardedPage).toHaveScreenshot("accounts-add.png", { maxDiffPixelRatio })
  // Accounts - ledger
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/accounts/add/ledger`)
  await onboardedPage.getByRole("button", { name: "Substrate" }).click()
  await onboardedPage.getByRole("button", { name: "Select a Network" }).click()
  await onboardedPage.getByRole("option", { name: "Polkadot", exact: true }).click()
  await onboardedPage.keyboard.press("End")
  await expect.soft(onboardedPage).toHaveScreenshot("accounts-ledger.png", { maxDiffPixelRatio })
  // Earn
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/earn/positions`)
  await expect.soft(onboardedPage).toHaveScreenshot("earn.png", { maxDiffPixelRatio })
  // Activity
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/tx-history`)
  await expect.soft(onboardedPage).toHaveScreenshot("activity.png", { maxDiffPixelRatio })
  // Settings
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/settings`)
  await expect.soft(onboardedPage).toHaveScreenshot("settings.png", { maxDiffPixelRatio })
  // Settings - Security & Privacy
  await onboardedPage.goto(
    `chrome-extension://${extensionId}/dashboard.html#/settings/security-privacy-settings`
  )
  await expect.soft(onboardedPage).toHaveScreenshot("settings-security-privacy.png", {
    maxDiffPixelRatio,
  })
  // Settings - Networks & Tokens
  await onboardedPage.goto(
    `chrome-extension://${extensionId}/dashboard.html#/settings/networks-tokens`
  )
  await expect.soft(onboardedPage).toHaveScreenshot("settings-network-tokens.png", {
    maxDiffPixelRatio,
  })
})
