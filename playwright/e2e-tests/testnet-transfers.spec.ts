import { expect, test } from "./fixtures"
import { testAssets } from "./transfers"
import { ethDevChain } from "./fixtures"

const dotAccName = "DOT Transfer"
const ethAccName = "ETH Transfer"

// Reads an EVM account's native balance straight from the local Anvil node via
// raw JSON-RPC (no extra deps).
const getEvmBalance = async (address: string): Promise<bigint> => {
  const res = await fetch(ethDevChain, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  })
  const { result } = await res.json()
  return BigInt(result)
}

// Minimal wei parser for decimal token amounts (e.g. "0.001" -> 10n ** 15n).
const parseEther = (value: string): bigint => {
  const [whole, frac = ""] = value.split(".")
  const fracPadded = `${frac}${"0".repeat(18)}`.slice(0, 18)
  return BigInt(whole || "0") * 10n ** 18n + BigInt(fracPadded || "0")
}

test("Transfer Assets", async ({
  extensionId,
  onboardedPage,
  importAccount,
  walletPopup,
  useDevChains,
}) => {
  await importAccount({
    type: "ethereum",
    mnemonic: "test test test test test test test test test test test junk",
    name: ethAccName,
  })
  await useDevChains()
  await onboardedPage.waitForTimeout(500)
  await onboardedPage.goto(
    `chrome-extension://${extensionId}/dashboard.html#/settings/networks-tokens/networks`
  )
  // enables testnet networks
  for (const data of testAssets) {
    if (data.needsEnabling === true) {
      await test.step(`Enabling ${data.chain}`, async () => {
        await onboardedPage.getByTestId("platform-options-switch").getByText(data.chainType).click()
        const searchParameter = data.chain.replace(/\s*\(.*?\)\s*/g, "").trim()
        await onboardedPage.getByPlaceholder("Search Networks").fill(searchParameter)
        const firstResult = onboardedPage.getByTestId("network-list-row").first()
        await expect(firstResult).toContainText(data.chain)
        await firstResult.getByTestId("component-toggle-button").first().click()
        await onboardedPage.getByTestId("platform-options-switch").getByText("all").click()
      })
    }
  }
  // goes back to portfolio page and select the created account
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/portfolio/tokens`)
  // stores send button
  const sendButton = onboardedPage
    .getByTestId("top-actions-buttons")
    .getByRole("button", { name: "Send" })

  // record recipient balances on-chain before any transfer
  const evmAssets = testAssets.filter((data) => data.chainType === "ethereum")
  const expectedDelta = new Map<string, bigint>()
  const balanceBefore = new Map<string, bigint>()
  for (const data of evmAssets) {
    expectedDelta.set(data.sendTo, (expectedDelta.get(data.sendTo) ?? 0n) + parseEther(data.amount))
    if (!balanceBefore.has(data.sendTo)) {
      balanceBefore.set(data.sendTo, await getEvmBalance(data.sendTo))
    }
  }

  // starts transfering assets
  for (const data of testAssets) {
    await test.step(`Transferring ${data.assetName} on ${data.chain}`, async () => {
      if (data.chainType === "substrate") {
        await onboardedPage.getByTestId("sidebar-account-list").getByText(dotAccName).click()
      } else {
        await onboardedPage.getByTestId("sidebar-account-list").getByText(ethAccName).click()
      }
      const popup = await walletPopup({ locator: sendButton })
      // searches for the specific token by asset name, type and chain.
      const result = popup
        .locator('[data-testid="token-picker-row"]')
        .filter({
          has: popup.getByTestId("picker-token-name").filter({ hasText: data.assetName }),
        })
        .filter({
          has: popup.getByTestId("component-token-pill").filter({ hasText: data.tokenType }),
        })
        .filter({
          has: popup.getByTestId("picker-token-network").filter({ hasText: data.chain }),
        })
      await expect(result).toBeVisible({ timeout: 30000 })
      await result.first().click()
      await popup.getByPlaceholder("Enter Address").fill(data.sendTo)
      await popup.keyboard.press("Enter")
      await popup.getByPlaceholder("0").fill(data.amount)
      await expect(popup.getByTestId("component-review-button")).toBeEnabled({ timeout: 10000 })
      await popup.getByTestId("component-review-button").click()

      //risk analysis assesment drawer
      await expect(popup.getByTestId("risk-analysis-button-no")).toBeVisible()
      await popup.getByTestId("risk-analysis-button-no").click()

      // acknowledge external address warning if present
      const warning = popup.getByTestId("send-funds-confirm-button").getByRole("checkbox").first()
      if (await warning.isVisible({ timeout: 2000 }).catch(() => false)) await warning.check()

      const confirmBtn = popup.getByTestId("send-funds-confirm-button").getByRole("button")
      await expect(confirmBtn).toBeEnabled({ timeout: 15000 })
      await confirmBtn.click()
      await expect(popup.getByRole("button", { name: "Close" })).toBeVisible({ timeout: 30000 })
      await popup.close()
    })
  }
  // check for transaction status on activity tab
  await onboardedPage.goto(`chrome-extension://${extensionId}/dashboard.html#/tx-history`)
  const transactionCount = testAssets.length
  for (let i = 0; i < transactionCount; i++) {
    await expect(onboardedPage.getByTestId("tx-history-row-transaction").nth(i)).toContainText(
      "Confirmed",
      { timeout: 30000 }
    )
  }

  // on-chain verification
  for (const [address, delta] of expectedDelta) {
    await test.step(`Verifying ${address} received funds on-chain`, async () => {
      await expect
        .poll(async () => (await getEvmBalance(address)) - (balanceBefore.get(address) ?? 0n), {
          timeout: 15000,
        })
        .toBe(delta)
    })
  }
})
