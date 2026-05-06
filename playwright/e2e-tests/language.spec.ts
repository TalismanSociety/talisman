import { expect, test } from "./fixtures"

const EXPECTED_LANGUAGES = [
  "English",
  "Deutsch",
  "Español",
  "Français",
  "Italiano",
  "日本語",
  "한국어",
  "Português Brasileiro",
  "Română",
  "Pусский",
  "Tiếng Việt",
  "简体",
]

test("Language settings - verify all languages and switch to Português Brasileiro", async ({
  onboardedPage,
  extensionId,
}) => {
  await test.step("Navigate to language settings", async () => {
    await onboardedPage.goto(
      `chrome-extension://${extensionId}/dashboard.html#/settings/general/language`
    )
    await expect(onboardedPage.getByText("Choose your preferred language")).toBeVisible()
  })

  await test.step("Verify all supported languages are listed", async () => {
    for (const language of EXPECTED_LANGUAGES) {
      await expect(onboardedPage.getByRole("button", { name: language, exact: true })).toBeVisible()
    }
  })

  await test.step("Switch to Português Brasileiro", async () => {
    await onboardedPage.getByRole("button", { name: "Português Brasileiro", exact: true }).click()
  })

  await test.step("Verify language was changed to Portuguese", async () => {
    await expect(onboardedPage.getByText("Segurança e Privacidade")).toBeVisible()
    await expect(onboardedPage.getByText("Escolha seu idioma preferido")).toBeVisible()
  })
})
