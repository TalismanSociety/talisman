import type { BaseQuote, EntryHop, QuoteLeg, QuoteParams } from "@core/domains/swaps/types"
import { describe, expect, it, vi } from "vitest"
import { quoteFromLegs } from "../helpers"
import {
  type HopModule,
  type IntermediateCandidate,
  pickIntermediateAccount,
  withEntryHops,
  withSingleLegQuotes,
} from "../hops"

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const KEYPAIR_RICH = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const KEYPAIR_POOR = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const LEDGER = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
const EXTERNAL = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"

const FINNEY_TAO = "bittensor:substrate-native"
const HUB_TAO = "964:evm-native"
const BASE_WTAO = "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67"
const ROBINHOOD_WTAO = "4663:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67"

const candidate = (
  address: string,
  type: IntermediateCandidate["type"],
  hubBalance: bigint,
  busy = false
): IntermediateCandidate => ({ address, type, hubBalance, busy })

describe("pickIntermediateAccount", () => {
  const candidates = [
    candidate(KEYPAIR_RICH, "keypair", 5n),
    candidate(KEYPAIR_POOR, "keypair", 1n),
    candidate(LEDGER, "ledger-ethereum", 0n),
  ]

  it("picks the recipient when it is one of the owned EVM accounts", () => {
    expect(pickIntermediateAccount(candidates, KEYPAIR_RICH.toLowerCase())).toBe(KEYPAIR_RICH)
    expect(pickIntermediateAccount(candidates, LEDGER)).toBe(LEDGER)
  })

  it("otherwise picks the free keypair holding the least of the hub token", () => {
    expect(pickIntermediateAccount(candidates, EXTERNAL)).toBe(KEYPAIR_POOR)
    expect(pickIntermediateAccount(candidates, SUB_ADDRESS)).toBe(KEYPAIR_POOR)
    expect(pickIntermediateAccount(candidates, null)).toBe(KEYPAIR_POOR)
  })

  it("skips the accounts a live plan holds", () => {
    const busy = [
      candidate(KEYPAIR_RICH, "keypair", 5n, true),
      candidate(KEYPAIR_POOR, "keypair", 1n, true),
      candidate(LEDGER, "ledger-ethereum", 0n),
    ]
    expect(pickIntermediateAccount(busy, KEYPAIR_RICH)).toBe(LEDGER)
  })

  it("falls back to a Ledger account, then to nothing", () => {
    expect(pickIntermediateAccount([candidate(LEDGER, "ledger-ethereum", 0n)], EXTERNAL)).toBe(
      LEDGER
    )
    expect(
      pickIntermediateAccount([candidate(LEDGER, "ledger-ethereum", 0n, true)], EXTERNAL)
    ).toBe(null)
    expect(pickIntermediateAccount([], EXTERNAL)).toBe(null)
  })
})

const HOP: EntryHop = {
  from: FINNEY_TAO,
  hub: HUB_TAO,
  via: "bittensor-evm",
  flag: "SWAPS_MULTI_HOP",
}

const leg = (overrides: Partial<QuoteLeg>): QuoteLeg => ({
  protocol: "forevermoney",
  fromTokenId: HUB_TAO,
  toTokenId: BASE_WTAO,
  signer: null,
  recipient: null,
  inputAmount: 0n,
  outputAmount: 0n,
  fees: [],
  timeInSec: 0,
  ...overrides,
})

const LEG0: QuoteLeg = leg({
  protocol: "bittensor-evm",
  fromTokenId: FINNEY_TAO,
  toTokenId: HUB_TAO,
  signer: SUB_ADDRESS,
  recipient: KEYPAIR_POOR,
  inputAmount: 1_000_000_000n,
  outputAmount: 999_999_500_000_000_000n,
  timeInSec: 12,
  data: { edHeldRao: "500" },
})

const LEG1: QuoteLeg = leg({
  signer: KEYPAIR_POOR,
  recipient: EXTERNAL,
  inputAmount: 999_999_500_000_000_000n,
  outputAmount: 998_979_999_000_000_000n,
  timeInSec: 180,
  data: { input: "upTo" },
})

const bittensorQuote = quoteFromLegs([LEG0], {
  protocol: "bittensor-evm",
  decentralisationScore: 3,
  providerLogo: "bittensor.svg",
  providerName: "Bittensor EVM",
})

const forevermoneyQuote = quoteFromLegs([LEG1], {
  protocol: "forevermoney",
  decentralisationScore: 2,
  providerLogo: "forevermoney.svg",
  providerName: "ForeverMoney",
  notice: "Experimental bridge",
  maxNativeTokenGasBuffer: "1020000000000000",
})

const viaModule: HopModule = {
  protocol: "bittensor-evm",
  getFromAssets: async () => [FINNEY_TAO, HUB_TAO],
  getToAssets: async (from) => (from === FINNEY_TAO ? [HUB_TAO] : [FINNEY_TAO]),
  getQuote: vi.fn(async () => bittensorQuote),
}

const finishingModule: HopModule & { decentralisationScore: number } = {
  protocol: "forevermoney",
  decentralisationScore: 2,
  entryHops: [HOP],
  getFromAssets: async () => [BASE_WTAO, HUB_TAO, ROBINHOOD_WTAO],
  getToAssets: async (from) =>
    from === HUB_TAO ? [BASE_WTAO, ROBINHOOD_WTAO] : from === null ? [BASE_WTAO, HUB_TAO] : [],
  getQuote: vi.fn(async () => forevermoneyQuote),
}

const signal = new AbortController().signal

const options = (enabled: boolean) => ({
  enabled: () => enabled,
  resolve: (protocol: string) => (protocol === "bittensor-evm" ? viaModule : undefined),
  candidates: async () => [
    candidate(KEYPAIR_RICH, "keypair", 5n),
    candidate(KEYPAIR_POOR, "keypair", 1n),
  ],
})

const QUOTE_PARAMS: QuoteParams = {
  fromTokenId: FINNEY_TAO,
  toTokenId: BASE_WTAO,
  fromAmount: 1_000_000_000n,
  fromAddress: SUB_ADDRESS,
  toAddress: EXTERNAL,
  input: "exact",
}

describe("withEntryHops", () => {
  it("leaves the module alone while the hop's flag is off", () => {
    expect(withEntryHops(finishingModule, options(false))).toBe(finishingModule)
  })

  it("advertises the hop's source and the hub's targets", async () => {
    const wrapped = withEntryHops(finishingModule, options(true))

    expect(await wrapped.getFromAssets(signal)).toEqual([
      BASE_WTAO,
      HUB_TAO,
      ROBINHOOD_WTAO,
      FINNEY_TAO,
    ])
    expect(await wrapped.getToAssets(FINNEY_TAO, signal)).toEqual([BASE_WTAO, ROBINHOOD_WTAO])
    expect(await wrapped.getToAssets(HUB_TAO, signal)).toEqual([BASE_WTAO, ROBINHOOD_WTAO])
    expect(await wrapped.getToAssets(null, signal)).toEqual([BASE_WTAO, HUB_TAO, ROBINHOOD_WTAO])
    expect(wrapped.decentralisationScore).toBe(2)
  })

  it("composes a two-leg quote through the intermediate", async () => {
    const wrapped = withEntryHops(finishingModule, options(true))

    const quote = (await wrapped.getQuote(QUOTE_PARAMS, signal)) as BaseQuote

    expect(viaModule.getQuote).toHaveBeenCalledWith(
      { ...QUOTE_PARAMS, toTokenId: HUB_TAO, toAddress: KEYPAIR_POOR, input: "exact" },
      signal
    )
    expect(finishingModule.getQuote).toHaveBeenCalledWith(
      {
        fromTokenId: HUB_TAO,
        toTokenId: BASE_WTAO,
        fromAmount: 999_999_500_000_000_000n,
        fromAddress: KEYPAIR_POOR,
        toAddress: EXTERNAL,
        selectedSubProtocol: undefined,
        input: "upTo",
      },
      signal
    )
    expect(quote).toEqual({
      protocol: "forevermoney",
      subProtocol: "via-bittensor-evm",
      decentralisationScore: 2,
      providerLogo: "forevermoney.svg",
      providerName: "ForeverMoney",
      notice: "Experimental bridge",
      maxNativeTokenGasBuffer: undefined,
      legs: [LEG0, LEG1],
      inputAmountBN: 1_000_000_000n,
      outputAmountBN: 998_979_999_000_000_000n,
      fees: [],
      timeInSec: 192,
    })
  })

  it("keeps every leg of both quotes, in order", async () => {
    const MID_TOKEN = "bittensor:substrate-dtao:1"
    const viaLegs: [QuoteLeg, QuoteLeg] = [
      { ...LEG0, toTokenId: MID_TOKEN, recipient: SUB_ADDRESS },
      { ...LEG0, fromTokenId: MID_TOKEN, outputAmount: 999_000_000_000_000_000n },
    ]
    const targetLegs: [QuoteLeg, QuoteLeg] = [
      { ...LEG1, toTokenId: ROBINHOOD_WTAO, recipient: KEYPAIR_POOR },
      { ...LEG1, fromTokenId: ROBINHOOD_WTAO, outputAmount: 997_000_000_000_000_000n },
    ]
    const presentation = { decentralisationScore: 2, providerLogo: "", providerName: "" }
    vi.mocked(viaModule.getQuote).mockResolvedValueOnce(
      quoteFromLegs(viaLegs, { ...presentation, protocol: "bittensor-evm" })
    )
    vi.mocked(finishingModule.getQuote).mockResolvedValueOnce(
      quoteFromLegs(targetLegs, { ...presentation, protocol: "forevermoney" })
    )

    const quote = (await withEntryHops(finishingModule, options(true)).getQuote(
      QUOTE_PARAMS,
      signal
    )) as BaseQuote

    expect(quote.legs).toEqual([...viaLegs, ...targetLegs])
    expect(quote.outputAmountBN).toBe(997_000_000_000_000_000n)
    expect(finishingModule.getQuote).toHaveBeenLastCalledWith(
      expect.objectContaining({ fromAmount: 999_000_000_000_000_000n }),
      signal
    )
  })

  it("passes a direct route through untouched", async () => {
    const wrapped = withEntryHops(finishingModule, options(true))
    const direct: QuoteParams = { ...QUOTE_PARAMS, fromTokenId: HUB_TAO, fromAddress: KEYPAIR_POOR }

    expect(await wrapped.getQuote(direct, signal)).toBe(forevermoneyQuote)
    expect(finishingModule.getQuote).toHaveBeenCalledWith(direct, signal)
  })

  it("offers no route without an intermediate account", async () => {
    const wrapped = withEntryHops(finishingModule, { ...options(true), candidates: async () => [] })

    expect(await wrapped.getQuote(QUOTE_PARAMS, signal)).toBe(null)
  })

  it("offers no route when the via module is not available", async () => {
    const wrapped = withEntryHops(finishingModule, { ...options(true), resolve: () => undefined })

    expect(await wrapped.getQuote(QUOTE_PARAMS, signal)).toBe(null)
  })
})

describe("withSingleLegQuotes", () => {
  const twoLegQuote = quoteFromLegs([LEG0, LEG1], {
    protocol: "lifi",
    decentralisationScore: 2,
    providerLogo: "lifi.svg",
    providerName: "LI.FI",
  })
  const quoting = (quotes: BaseQuote | BaseQuote[] | null): HopModule => ({
    protocol: "lifi",
    getFromAssets: async () => [],
    getToAssets: async () => [],
    getQuote: async () => quotes,
  })

  it("drops the quotes that take more than one transaction", async () => {
    const wrapped = withSingleLegQuotes(quoting([twoLegQuote, forevermoneyQuote]))
    expect(await wrapped.getQuote(QUOTE_PARAMS, signal)).toEqual([forevermoneyQuote])
  })

  it("offers nothing when every quote takes several", async () => {
    expect(await withSingleLegQuotes(quoting([twoLegQuote])).getQuote(QUOTE_PARAMS, signal)).toBe(
      null
    )
    expect(await withSingleLegQuotes(quoting(twoLegQuote)).getQuote(QUOTE_PARAMS, signal)).toBe(
      null
    )
  })

  it("passes a module with no quote through", async () => {
    expect(await withSingleLegQuotes(quoting(null)).getQuote(QUOTE_PARAMS, signal)).toBe(null)
  })
})
