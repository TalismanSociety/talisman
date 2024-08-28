import { expect, test } from "./fixtures"

test.beforeAll("popup page", async ({ page, extensionId, context }) => {
  await page.goto(`chrome-extension://${extensionId}/onboarding.html`)
  await expect(page.locator("body")).toContainText("Multi-chain made easy")
  await page.getByTestId("onboarding-get-started-button").click()
  await expect(page).toHaveURL(`chrome-extension://${extensionId}/onboarding.html#/password`)
  await page.getByPlaceholder("Enter password").fill("123456")
  await page.getByPlaceholder("Confirm password").fill("123456")
  await page.getByTestId("onboarding-continue-button").click()
  await expect(page).toHaveURL(`chrome-extension://${extensionId}/onboarding.html#/privacy`)
  await page.getByTestId("onboarding-no-thanks-button").click()
  await expect(page).toHaveURL(`chrome-extension://${extensionId}/onboarding.html#/accounts/add`)
  await page.getByTestId("onboarding-create-acc-button").first().click()
  await page.getByTestId("onboarding-choose-name-input").fill("E2E Test")
  await page.getByTestId("onboarding-create-button").click()

  const allPages = context.pages()
  await allPages[0].close()
  await allPages[2].close()

  await page.getByTestId("onboarding-acknowledge-button").click()
  await page.getByTestId("onboarding-mnemonic-skip-button").click()
  await expect(page).toHaveURL(`chrome-extension://${extensionId}/onboarding.html#/success`)
  await page.getByTestId("onboarding-enter-talisman-button").click()
  await expect(page).toHaveURL(
    `chrome-extension://${extensionId}/dashboard.html#/portfolio?onboarded`
  )
})

test("This test will use the previously created wallet enviroment", async ({
  extensionId,
  page,
}) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html?embedded`)
})

test("This test will use the previously created wallet enviroment and will run in parallel", async ({
  extensionId,
  page,
}) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html?embedded`)
})
