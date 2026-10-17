import { db } from "@core/db"
import type { SwapPlan, SwapPlanId } from "@core/domains/swaps/plans/types"
import type { WalletTransactionEth } from "@core/domains/transactions/types"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@ui/domains/Swap/components/SwapPlanProgress", () => ({
  SwapPlanProgress: ({ id }: { id: string }) => <div>{`progress of ${id}`}</div>,
}))
vi.mock("../TxProgress", () => ({
  TxProgress: ({ hash }: { hash: string }) => <div>{`transaction ${hash}`}</div>,
}))

import { TxHistoryModal } from "../TxHistory/TxHistoryModal"

const PLAN_ID = "plan-1" as SwapPlanId
const HASH = `0x${"aa".repeat(32)}` as const

const planLegRow: WalletTransactionEth = {
  id: HASH,
  hash: HASH,
  platform: "ethereum",
  networkId: "964",
  account: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
  status: "pending",
  confirmed: false,
  payload: {},
  nonce: 3,
  timestamp: 1,
  txInfo: {
    type: "swap-forevermoney",
    fromTokenId: "964:evm-native",
    toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
    fromAmount: "1",
    toAmount: "1",
    to: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
    destinationStartBlock: "1",
    plan: { id: PLAN_ID, leg: 1 },
  },
}

const renderModal = () => render(<TxHistoryModal tx={planLegRow} isOpen onClose={() => {}} />)

describe("TxHistoryModal", () => {
  beforeEach(async () => {
    await db.swapPlans.clear()
  })

  it("opens the plan's progress from one of its legs", async () => {
    await db.swapPlans.put({ id: PLAN_ID, phase: "running" } as SwapPlan)
    renderModal()

    expect(await screen.findByText(`progress of ${PLAN_ID}`)).toBeTruthy()
    expect(screen.queryByText(`transaction ${HASH}`)).toBeNull()
  })

  it("shows the transaction once its plan was pruned", async () => {
    renderModal()

    expect(await screen.findByText(`transaction ${HASH}`)).toBeTruthy()
    expect(screen.queryByText(`progress of ${PLAN_ID}`)).toBeNull()
  })
})
