import { test } from "./fixtures"

const customChain = "https://"

// Adds a custom chain
test.skip("Implements the usage of devchains", async ({ onboardedPage, extensionId }) => {
  await onboardedPage.goto(
    `chrome-extension://${extensionId}/dashboard.html#/settings/networks-tokens/networks/add`
  )
  await onboardedPage.getByRole("button", { name: "Select a platform" }).click()
  await onboardedPage.getByRole("option", { name: "Ethereum" }).click()
  await onboardedPage.getByPlaceholder("https://").fill(customChain)
  await onboardedPage.getByRole("button", { name: "Save" }).click()
})
