import type { WalletTransactionEth } from "@core/domains/transactions/types"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { TxReplaceActions } from "../TxProgress"

vi.mock("@ui/state/chaindata", () => ({
  useNetworkById: () => ({ id: "964", platform: "ethereum", preserveGasEstimate: false }),
  useAnyNetwork: () => null,
}))

vi.mock("../TxReplaceDrawer", () => ({ TxReplaceDrawer: () => null }))

vi.mock("@ui/components/ProcessAnimation/ProcessAnimation", () => ({
  ProcessAnimation: () => null,
}))

vi.mock("@ui/state/transactions", () => ({ useTransaction: () => undefined }))

const pendingTx: WalletTransactionEth = {
  id: `0x${"aa".repeat(32)}`,
  hash: `0x${"aa".repeat(32)}`,
  platform: "ethereum",
  networkId: "964",
  account: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
  status: "pending",
  confirmed: false,
  payload: {},
  nonce: 3,
  timestamp: 1,
}

const actionsOf = () => screen.getByRole("button", { name: "Speed Up" }).parentElement

describe("TxReplaceActions", () => {
  it("offers speed up and cancel on a pending transaction", () => {
    render(<TxReplaceActions tx={pendingTx} />)
    expect(actionsOf()?.className).not.toContain("invisible")
  })

  it("offers them on a swap plan leg, whose plan adopts the replacement", () => {
    render(
      <TxReplaceActions
        tx={{
          ...pendingTx,
          txInfo: {
            type: "swap-forevermoney",
            fromTokenId: "964:evm-native",
            toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
            fromAmount: "1",
            toAmount: "1",
            to: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
            destinationStartBlock: "1",
            plan: { id: "plan" as never, leg: 1 },
          },
        }}
      />
    )
    expect(actionsOf()?.className).not.toContain("invisible")
  })
})
