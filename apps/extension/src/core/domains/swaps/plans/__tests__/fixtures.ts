import { abiForevermoneyAlphaGateway } from "@core/domains/forevermoney/abi"
import type { LegBound } from "@core/domains/swaps/types"
import { encodeFunctionData } from "viem"

import type { PlanLeg, PlanSummary, SwapPlanId } from "../types"

export const PLAN_ID = "plan-1" as SwapPlanId
export const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
/** private key 0x11…11 */
export const EVM_ADDRESS = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A"
export const EVM_PRIVATE_KEY = `0x${"11".repeat(32)}` as const
export const RECIPIENT = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
export const GATEWAY = "0xd5Fa238aa4177f6c1341491969d9cBeec94EEd69"
export const ALPHA_TOKEN = "0xC5b6C1632d34901239396F5E1BDe54B342900256"
export const BASE_SELECTOR = 15971525489660198786n
export const BASE_WTAO = "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67"
export const T0 = 1_700_000_000_000

export const LEG0_OUTPUT = 999_999_500_000_000_000n
export const LEG1_AMOUNT = 990_000_000_000_000_000n
export const CCIP_FEE_WITH_BUFFER = 1_020_000_000_000_000n

export const bridgeOutData = (amount: bigint, recipient: `0x${string}` = RECIPIENT) =>
  encodeFunctionData({
    abi: abiForevermoneyAlphaGateway,
    functionName: "bridgeOut",
    args: [BASE_SELECTOR, ALPHA_TOKEN, recipient, amount, 0n, amount],
  })

export const BOUND: LegBound = {
  platform: "ethereum",
  chainId: 964,
  signer: EVM_ADDRESS,
  to: GATEWAY,
  calls: [{ template: bridgeOutData(0n), amountSlots: [3, 5], maxNetworkFee: "21000000" }],
  floor: "980100000000000000",
  maxSpend: LEG0_OUTPUT.toString(),
}

export const LEG0: PlanLeg = {
  quote: {
    protocol: "bittensor-evm",
    fromTokenId: "bittensor:substrate-native",
    toTokenId: "964:evm-native",
    signer: SUB_ADDRESS,
    recipient: EVM_ADDRESS,
    inputAmount: "1000000000",
    outputAmount: LEG0_OUTPUT.toString(),
    fees: [],
    timeInSec: 12,
    data: { edHeldRao: "500" },
  },
  signerType: "keypair",
  bound: null,
  nonce: 7,
  state: { at: "queued" },
}

export const LEG1: PlanLeg = {
  quote: {
    protocol: "forevermoney",
    fromTokenId: "964:evm-native",
    toTokenId: BASE_WTAO,
    signer: EVM_ADDRESS,
    recipient: RECIPIENT,
    inputAmount: LEG0_OUTPUT.toString(),
    outputAmount: LEG1_AMOUNT.toString(),
    fees: [],
    timeInSec: 180,
    data: { input: "upTo" },
  },
  signerType: "keypair",
  bound: BOUND,
  state: { at: "queued" },
}

export const SUMMARY: PlanSummary = {
  protocol: "forevermoney",
  subProtocol: "via-bittensor-evm",
  slippage: 0.005,
}

export const PROPOSAL = {
  id: PLAN_ID,
  legs: [LEG0, LEG1] as [PlanLeg, PlanLeg],
  summary: SUMMARY,
}

export const LEG0_HASH = `0x${"11".repeat(32)}` as const

export const ADMIT_LEG0 = {
  type: "admitted",
  leg: 0,
  hash: LEG0_HASH,
  nonce: 7,
  deadlineAt: T0 + 20 * 60_000,
  evidence: { platform: "polkadot", era: { birth: 100, period: 64 } },
} as const

export const LEG0_LANDED = {
  type: "observed",
  leg: 0,
  candidates: 1,
  observation: { status: "landed", hash: LEG0_HASH, amount: LEG0_OUTPUT },
} as const
