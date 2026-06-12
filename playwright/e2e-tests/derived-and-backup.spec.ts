import { expect, test } from "./fixtures"

const accName = "Derivated Account"
const accAmount = 5

test("Import an account and its derived accounts & verify mnemonic backup alert", async ({
  extensionId,
  onboardedPage,
  importAccount,
  addNewAccount,
}) => {
  await importAccount({ type: "ethereum", name: accName, multipleAccs: accAmount })
  await expect(onboardedPage.getByTestId("sidebar-account-list").getByText(accName)).toHaveCount(
    accAmount
  )

  await addNewAccount({ type: "ethereum" })
  // check if recovery phrase backup message shows up on settings
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/settings/mnemonics`)
  await expect(
    onboardedPage.getByText("recovery phrase(s) have not been backed up yet")
  ).toBeVisible()
  await expect(onboardedPage.getByText("Backup", { exact: true })).toBeVisible()
  // check if recovery phrase backup popup shows up
  await onboardedPage.goto(`chrome-extension://${extensionId}/popup.html#/portfolio/`)
  await expect(onboardedPage.getByText("Protect your funds")).toBeVisible()
})
