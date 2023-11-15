import data from "../fixtures/data"
import test, { expect } from "../fixtures/setup"

test.describe("Onboarding", async () => {
  test.afterEach(async ({ context }) => {
    await context.close()
  })

  test("Can onboard with No account", async ({ onboarding, extensionId }) => {
    const baseUrl = `chrome-extension://${extensionId}/onboarding.html`
    await test.step("Welcome page", async () => {
      await onboarding.page.waitForLoadState("domcontentloaded")
      expect(onboarding.page.url()).toBe(baseUrl)
      const button = onboarding.page.getByTestId("get-started-button")
      await button.click()
      expect(onboarding.page.url()).toBe(`${baseUrl}#/password`)
    })

    await test.step("Enter password", async () => {
      await onboarding.page.waitForLoadState("domcontentloaded")
      expect(onboarding.page.url()).toBe(`${baseUrl}#/password`)
      const pwBox = onboarding.page.getByTestId("password-input1")
      await expect(pwBox).toBeEditable()
      await pwBox.first().fill(data.password, { timeout: 3000 })

      const confirmBox = onboarding.page.getByTestId("password-input2")
      await expect(confirmBox).toBeEditable()
      await confirmBox.first().fill(data.password, { timeout: 3000 })

      const submitButton = onboarding.page.getByTestId("continue-button")
      expect(submitButton).toBeEnabled()
      expect(onboarding.page)
      await submitButton.click()
      await onboarding.page.waitForURL(`${baseUrl}#/privacy`)
    })

    await test.step("Privacy", async () => {
      await onboarding.page.waitForLoadState("domcontentloaded")
      expect(onboarding.page.url()).toBe(`${baseUrl}#/privacy`)
      const rejectButton = onboarding.page.getByTestId("privacy-reject-btn")
      expect(rejectButton).toBeEnabled()
      await rejectButton.click()

      await onboarding.page.waitForURL(`${baseUrl}#/accounts/add`)
    })
  })
})
