import BigNumber from "bignumber.js"
import { describe, expect, it } from "vitest"
import { type QuoteLeg, quoteFromLegs } from "../common.swap-module"

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const EVM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const RECIPIENT = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"

const presentation = {
  protocol: "forevermoney" as const,
  decentralisationScore: 2,
  providerLogo: "forevermoney.svg",
  providerName: "ForeverMoney",
}

const moveToEvm: QuoteLeg = {
  protocol: "bittensor-evm",
  fromTokenId: "bittensor:substrate-native",
  toTokenId: "964:evm-native",
  signer: SUB_ADDRESS,
  recipient: EVM_ADDRESS,
  inputAmount: 2_000_000_000n,
  outputAmount: 1_999_999_500_000_000_000n,
  fees: [
    { name: "Est. Gas Fees", tokenId: "bittensor:substrate-native", amount: BigNumber("0.0001") },
  ],
  timeInSec: 12,
  data: { direction: "sub-to-evm" },
}

const bridgeToBase: QuoteLeg = {
  protocol: "forevermoney",
  fromTokenId: "964:evm-native",
  toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
  signer: EVM_ADDRESS,
  recipient: RECIPIENT,
  inputAmount: 1_999_999_500_000_000_000n,
  outputAmount: 1_990_000_000_000_000_000n,
  fees: [
    {
      name: "Chainlink CCIP Fee",
      tokenId: "964:evm-native",
      amount: BigNumber("0.00102"),
      additional: true,
    },
  ],
  timeInSec: 180,
}

describe("quoteFromLegs", () => {
  it("summarises a single leg as the leg itself", () => {
    expect(quoteFromLegs([bridgeToBase], presentation)).toEqual({
      ...presentation,
      legs: [bridgeToBase],
      inputAmountBN: 1_999_999_500_000_000_000n,
      outputAmountBN: 1_990_000_000_000_000_000n,
      fees: [
        {
          name: "Chainlink CCIP Fee",
          tokenId: "964:evm-native",
          amount: BigNumber("0.00102"),
          additional: true,
        },
      ],
      timeInSec: 180,
    })
  })

  it("spends the first leg's input and delivers the last leg's output", () => {
    expect(quoteFromLegs([moveToEvm, bridgeToBase], presentation)).toEqual({
      ...presentation,
      legs: [moveToEvm, bridgeToBase],
      inputAmountBN: 2_000_000_000n,
      outputAmountBN: 1_990_000_000_000_000_000n,
      fees: [
        {
          name: "Est. Gas Fees",
          tokenId: "bittensor:substrate-native",
          amount: BigNumber("0.0001"),
        },
        {
          name: "Chainlink CCIP Fee",
          tokenId: "964:evm-native",
          amount: BigNumber("0.00102"),
          additional: true,
        },
      ],
      timeInSec: 192,
    })
  })

  it("rejects a leg that spends another token than the previous leg delivers", () => {
    expect(() =>
      quoteFromLegs([moveToEvm, { ...bridgeToBase, fromTokenId: "1:evm-native" }], presentation)
    ).toThrow("Quote legs do not chain")
  })

  it("rejects a leg signed by someone else than the previous leg's recipient", () => {
    expect(() =>
      quoteFromLegs([moveToEvm, { ...bridgeToBase, signer: RECIPIENT }], presentation)
    ).toThrow("Quote legs do not chain")
  })
})
