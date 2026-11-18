import { describe, expect, it } from "vitest"

import { isTxInfoBittensorStake, isTxInfoSwap } from "./exports"
import type { WalletTransactionInfo } from "./types"

const amounts = { fromAmount: "1", toAmount: "1" }
const dTaoSwap: WalletTransactionInfo = {
  type: "swap-bittensor-dtao",
  fromTokenId: "bittensor:substrate-native",
  toTokenId: "bittensor:substrate-dtao:64:5Yuma",
  to: "5Staker",
  ...amounts,
}
const wizardStake: WalletTransactionInfo = {
  type: "bittensor-staking",
  fromTokenId: "bittensor:substrate-native",
  toTokenId: "bittensor:substrate-dtao:64",
  hotkey: "5Yuma",
  ...amounts,
}
const bridge: WalletTransactionInfo = {
  type: "swap-bittensor-evm",
  fromTokenId: "bittensor:substrate-native",
  toTokenId: "964:evm-native",
  to: "0x1",
  ...amounts,
}

describe("transaction kinds", () => {
  it("counts a dTAO swap as a swap, like a stake from the wizards", () => {
    expect(isTxInfoSwap(dTaoSwap)).toBe(true)
    expect(isTxInfoSwap(wizardStake)).toBe(true)
  })

  it("knows a stake from Swap or from the wizards settles with its transaction", () => {
    expect(isTxInfoBittensorStake(dTaoSwap)).toBe(true)
    expect(isTxInfoBittensorStake(wizardStake)).toBe(true)
    expect(isTxInfoBittensorStake(bridge)).toBe(false)
    expect(isTxInfoBittensorStake(undefined)).toBe(false)
  })
})
