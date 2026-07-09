import { expect, test } from "./fixtures"

const ACCOUNT_NAME = "MM ETH"

test("Access Metamask e2e DApp and connect wallet", async ({ importAccount, context }) => {
  // create an ethereum account for the test
  const ethAccount = await importAccount({ type: "ethereum", name: ACCOUNT_NAME })
  await expect(ethAccount.getByTestId("sidebar-account-list")).toContainText(ACCOUNT_NAME)
  // access metamask test dapp
  await ethAccount.goto("https://metamask.github.io/test-dapp/")
  // wait for wallet popup to appear after clicking connect
  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    ethAccount.locator("#connectButton").click(),
  ])

  // interacts with wallet popup
  await popup.waitForTimeout(5000)
  await popup.bringToFront()
  await popup.setViewportSize({ width: 400, height: 600 })
  // the first account is preselected on a fresh connect, clicking it would deselect it
  await expect(popup.getByRole("button", { name: ACCOUNT_NAME })).toBeVisible()
  await popup.getByTestId("connection-connect-button").click()
  // verify that the account is connected on metamask test dapp
  await expect(ethAccount.locator("#accounts")).toContainText("0x")
})
