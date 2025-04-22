import { ETH_ACC_ADDRESS, ETH_ACC_NAME } from "./constants"
import { expect, test } from "./fixtures"

test("MM e2e", async ({ addAccount, context }) => {
  //ethereum account creation
  const ethAccount = await addAccount({ type: "ethereum", name: ETH_ACC_NAME })
  await expect(ethAccount.getByTestId("sidebar-account-list")).toContainText(ETH_ACC_NAME)
  await ethAccount.goto("https://metamask.github.io/test-dapp/")
  //close unwanted tabs
  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    await ethAccount.locator("#connectButton").click(),
  ])
  //interacts with wallet popup
  await popup.waitForTimeout(5000)
  await popup.bringToFront()
  await popup.setViewportSize({ width: 1200, height: 800 })
  await popup.getByRole("button", { name: ETH_ACC_NAME }).click()
  await popup.getByTestId("connection-connect-button").click()
  await expect(ethAccount.locator("#accounts")).toContainText(ETH_ACC_ADDRESS)
})
