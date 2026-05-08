import { expect, test } from "./fixtures"

const maxDiffPixelRatio = 0.02

test("Visual Regression Test", async ({ onboardedPage, extensionId }) => {
  await onboardedPage.getByTestId("onboarding-toast-animated").click()
  await onboardedPage.emulateMedia({ reducedMotion: "reduce" })

  await test.step("Portfolio", async () => {
    await expect(onboardedPage).toHaveScreenshot("portfolio.png", { maxDiffPixelRatio })
  })

  await test.step("Accounts - Add", async () => {
    await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/accounts/add/`)
    await expect(onboardedPage).toHaveScreenshot("accounts-add.png", { maxDiffPixelRatio })
  })

  await test.step("Accounts - Ledger", async () => {
    await onboardedPage.goto(
      `chrome-extension://${extensionId}/dashboard.html#/accounts/add/ledger`
    )
    await onboardedPage.getByRole("button", { name: "Substrate" }).click()
    await onboardedPage.getByRole("button", { name: "Select a Network" }).click()
    await onboardedPage.getByRole("option", { name: "Polkadot", exact: true }).click()
    await onboardedPage.keyboard.press("End")
    await expect(onboardedPage).toHaveScreenshot("accounts-ledger.png", { maxDiffPixelRatio })
  })

  await test.step("Earn", async () => {
    await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/earn/positions`)
    await expect(onboardedPage).toHaveScreenshot("earn.png", { maxDiffPixelRatio })
  })

  await test.step("Activity", async () => {
    await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/tx-history`)
    await expect(onboardedPage).toHaveScreenshot("activity.png", { maxDiffPixelRatio })
  })

  await test.step("Settings", async () => {
    await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/settings`)
    await expect(onboardedPage).toHaveScreenshot("settings.png", { maxDiffPixelRatio })
  })

  await test.step("Settings - Security & Privacy", async () => {
    await onboardedPage.goto(
      `chrome-extension://${extensionId}/dashboard.html#/settings/security-privacy-settings`
    )
    await expect(onboardedPage).toHaveScreenshot("settings-security-privacy.png", {
      maxDiffPixelRatio,
    })
  })

  await test.step("Settings - Networks & Tokens", async () => {
    await onboardedPage.goto(
      `chrome-extension://${extensionId}/dashboard.html#/settings/networks-tokens`
    )
    await expect(onboardedPage).toHaveScreenshot("settings-network-tokens.png", {
      maxDiffPixelRatio,
    })
  })
})
