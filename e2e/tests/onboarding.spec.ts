import data from "../fixtures/data"
import test, { expect } from "../fixtures/setup"

test.describe("Onboarding", async () => {
  test.beforeEach(async ({ onboarding, extensionUrl }) => {
    const onboardUrl = `${extensionUrl}/onboarding.html`

    await test.step("Welcome page", async () => {
      await onboarding.page.waitForLoadState("domcontentloaded")
      expect(onboarding.page.url()).toBe(onboardUrl)
      const button = onboarding.page.getByTestId("get-started-button")
      await button.click()
      await onboarding.page.waitForURL(`${onboardUrl}#/password`)
    })

    await test.step("Enter password", async () => {
      await onboarding.page.waitForLoadState("domcontentloaded")
      expect(onboarding.page.url()).toBe(`${onboardUrl}#/password`)
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
      await onboarding.page.waitForURL(`${onboardUrl}#/privacy`)
    })

    await test.step("Privacy", async () => {
      await onboarding.page.waitForLoadState("domcontentloaded")
      expect(onboarding.page.url()).toBe(`${onboardUrl}#/privacy`)
      const rejectButton = onboarding.page.getByTestId("privacy-reject-btn")
      expect(rejectButton).toBeEnabled()
      await rejectButton.click()

      await onboarding.page.waitForURL(`${onboardUrl}#/accounts/add`)
    })
  })

  test.afterEach(async ({ context }) => {
    await context.close()
  })

  test("Can onboard with no account", async ({ onboarding, portfolio, extensionUrl }) => {
    const onboardUrl = `${extensionUrl}/onboarding.html`

    await test.step("Account page", async () => {
      await onboarding.page.waitForLoadState("domcontentloaded")
      expect(onboarding.page.url()).toBe(`${onboardUrl}#/accounts/add`)
      const skipButton = onboarding.page.getByTestId("do-it-later-btn")
      expect(skipButton).toBeEnabled()
      await skipButton.click()

      await onboarding.page.waitForURL(`${onboardUrl}#/success`)
    })

    await test.step("Success page", async () => {
      await onboarding.page.waitForLoadState("domcontentloaded")
      expect(onboarding.page.url()).toBe(`${onboardUrl}#/success`)
      const continueButton = onboarding.page.getByTestId("continue-btn")
      expect(continueButton).toBeEnabled()
      await continueButton.click()

      expect(onboarding.page.isClosed())
      await portfolio.page.waitForLoadState("domcontentloaded")
      expect(portfolio.page.url()).toBe(`${extensionUrl}/dashboard.html#/portfolio?onboarded`)
      await expect(onboarding.page.getByTestId("no-accounts-banner")).toBeInViewport()
    })
  })
})
