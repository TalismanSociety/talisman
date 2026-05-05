import type { Page } from "@playwright/test"
import { DEFAULT_PASSWORD, expect, test } from "./fixtures"

const NEW_PASSWORD = "newpassword123"

test("Check if its possible to change seedphrase with a pending account backup", async ({
  extensionId,
  onboardedPage,
  addNewAccount,
}) => {
  await addNewAccount({ type: "ethereum" })
  await onboardedPage.goto(
    `chrome-extension://${extensionId}/dashboard.html#/settings/security-privacy-settings/`
  )
  await expect(onboardedPage.getByTestId("change-password-button")).toBeDisabled()
})

test("Change password, lock the wallet and try to backup seedphrase", async ({
  extensionId,
  onboardedPage,
  importAccount,
}) => {
  async function backupSeedPhrase(page: Page) {
    return test.step("Login", async () => {
      await page.goto(`chrome-extension://${extensionId}/dashboard.html#/settings/mnemonics`)
      await page.getByTestId("mnemonic-context-menu-trigger").click()
      await page.getByTestId("mnemonics-context-menu-item-backup").click()
      await page.getByTestId("mnemonic-acknowledge-button").click()
      await page.getByPlaceholder("Enter Password").fill(NEW_PASSWORD)
      await page.getByRole("button", { name: "View Recovery Phrase" }).click()
      await expect(
        page.getByText("Only reveal your recovery phrase when in a secure location")
      ).toBeVisible()
    })
  }

  await importAccount({ type: "ethereum" })
  await onboardedPage.goto(
    `chrome-extension://${extensionId}/dashboard.html#/settings/security-privacy-settings/change-password`
  )
  await expect(onboardedPage.getByText("Change your password")).toBeVisible()

  const oldPasswordInput = onboardedPage.getByPlaceholder("Enter Old Password")
  const newPasswordInput = onboardedPage.getByPlaceholder("Enter New Password")
  const confirmPasswordInput = onboardedPage.getByPlaceholder("Confirm New Password")
  const submitButton = onboardedPage.getByRole("button", { name: "Submit" })

  await test.step("Reject password shorter than 6 characters", async () => {
    await oldPasswordInput.fill(DEFAULT_PASSWORD)
    await newPasswordInput.fill("abc")
    await expect(
      onboardedPage.getByText("Password must be at least 6 characters long")
    ).toBeVisible()
    await expect(submitButton).toBeDisabled()
  })

  await test.step("Reject mismatched passwords", async () => {
    await newPasswordInput.fill(NEW_PASSWORD)
    await confirmPasswordInput.fill("doesnotmatch")
    await expect(onboardedPage.getByText("Passwords must match")).toBeVisible()
    await expect(submitButton).toBeDisabled()
  })

  await test.step("Reject incorrect old password", async () => {
    await oldPasswordInput.fill("wrongpassword")
    await newPasswordInput.fill(NEW_PASSWORD)
    await confirmPasswordInput.fill(NEW_PASSWORD)
    await expect(submitButton).toBeEnabled()
    await submitButton.click()
    await expect(onboardedPage.getByText("Incorrect password")).toBeVisible({ timeout: 10_000 })
  })

  await test.step("Change password with valid inputs", async () => {
    await oldPasswordInput.fill(DEFAULT_PASSWORD)
    await newPasswordInput.fill(NEW_PASSWORD)
    await confirmPasswordInput.fill(NEW_PASSWORD)
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    await expect(onboardedPage.getByText("Changing password")).toBeVisible()
    await expect(onboardedPage.getByText("Password changed")).toBeVisible({ timeout: 30_000 })
    await expect(onboardedPage).toHaveURL(/portfolio/)
  })

  // Backup seedphrase after password change
  await backupSeedPhrase(onboardedPage)

  await test.step("Verify new password works via lock and unlock", async () => {
    const context = onboardedPage.context()

    // Keep a blank page alive so the browser context survives when extension pages close on lock
    const anchor = await context.newPage()
    await anchor.goto("about:blank")

    const popupPage = await context.newPage()
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)
    await popupPage.setViewportSize({ width: 400, height: 600 })

    // Open navigation drawer and lock the wallet
    await popupPage.getByRole("button", { name: "More" }).click()
    await expect(popupPage.getByText("Lock Wallet")).toBeVisible()
    await popupPage
      .getByText("Lock Wallet")
      .click()
      .catch(() => {})

    // Extension pages close on lock — open a fresh popup to unlock
    const loginPage = await context.newPage()
    await loginPage.goto(`chrome-extension://${extensionId}/popup.html`)

    await expect(loginPage.getByPlaceholder("Enter password")).toBeVisible()
    await loginPage.getByPlaceholder("Enter password").fill(NEW_PASSWORD)
    await loginPage.getByRole("button", { name: "Unlock" }).click()

    await expect(loginPage.getByRole("button", { name: "Portfolio" })).toBeVisible({
      timeout: 10_000,
    })

    // Backup seedphrase after wallet locking
    await backupSeedPhrase(loginPage)

    await anchor.close()
  })
})
