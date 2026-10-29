import { BITTENSOR_BALANCE_TRANSFER_PRECOMPILE } from "@core/domains/bittensor/constants"
import type { ExtrinsicEvents, SwapEnv } from "@core/domains/swaps/env"
import type { LegObservation, SentLeg } from "@core/domains/swaps/types"
import type { WalletTransaction } from "@core/domains/transactions/types"
import { abiBittensorBalanceTransfer } from "@core/util/abi"
import type { Network, Token } from "@talismn/chaindata-provider"
import { frontierH160ToSs58Mirror } from "@talismn/crypto"
import type { ScaleApi } from "@talismn/sapi"
import BigNumber from "bignumber.js"
import { encodeFunctionData, type PublicClient } from "viem"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { bittensorEvmSwapModule } from "../bittensorEvm"

// --- Fake env ---

const mockGetStorage = vi.fn()
const mockGetFeeEstimate = vi.fn()
const mockEstimateGas = vi.fn()
const mockGetGasPrice = vi.fn()
const mockSubstrateSend = vi.fn()
const mockDecodeEvents = vi.fn()
const mockGetBalance = vi.fn()
const mockGetBlock = vi.fn()
const mockGetTransactionReceipt = vi.fn()
const mockGetTransactionCount = vi.fn()
const mockGetTransaction = vi.fn()

const EVM_NETWORK = {
  id: "964",
  platform: "ethereum",
  nativeTokenId: "964:evm-native",
}
const SUB_TOKEN = {
  id: "bittensor:substrate-native",
  type: "substrate-native",
  decimals: 9,
  symbol: "TAO",
  networkId: "bittensor",
}
const EVM_TOKEN = {
  id: "964:evm-native",
  type: "evm-native",
  decimals: 18,
  symbol: "TAO",
  networkId: "964",
}

const quoteSapi = {
  getStorage: mockGetStorage,
  getFeeEstimate: mockGetFeeEstimate,
  getExtrinsicPayload: vi.fn(async (pallet: string, method: string, args: unknown) => ({
    payload: { pallet, method, args },
    txMetadata: undefined,
  })),
}

// prepareTransactionRequest returns the request unchanged so we can observe what was built
const evmClient = {
  estimateGas: mockEstimateGas,
  getGasPrice: mockGetGasPrice,
  getBalance: mockGetBalance,
  getBlock: mockGetBlock,
  getTransactionReceipt: mockGetTransactionReceipt,
  getTransactionCount: mockGetTransactionCount,
  getTransaction: mockGetTransaction,
  prepareTransactionRequest: async (request: unknown) => request,
}

const env: SwapEnv = {
  getNetwork: async (id) => (id === EVM_NETWORK.id ? (EVM_NETWORK as Network) : null),
  getToken: async (id) =>
    ([SUB_TOKEN, EVM_TOKEN].find((token) => token.id === id) as Token | undefined) ?? null,
  evmClient: async () => evmClient as unknown as PublicClient,
  substrateApi: async () => quoteSapi as unknown as ScaleApi,
  substrateSend: (...args) => mockSubstrateSend(...args),
  decodeExtrinsicEvents: (...args) => mockDecodeEvents(...args),
  proxyFetch: async () => {
    throw new Error("Bittensor EVM calls no Talisman proxy")
  },
}

// --- Test helpers ---

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const SUB_PUBKEY = "0xc4518fa0ed143e016e4a1410193704924b890de8f854b94c7a6037651ec65dd0"
const EVM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

const ED = 500n
const WEI_PER_RAO = 1_000_000_000n
const ONE_TAO_RAO = 1_000_000_000n
const ONE_TAO_WEI = ONE_TAO_RAO * WEI_PER_RAO
const FEE_RAO = 100_000n

const signal = new AbortController().signal

const quoteSubToEvm = (fromAmount: bigint, toAddress: string | null = EVM_ADDRESS) =>
  bittensorEvmSwapModule.getQuote(
    {
      fromTokenId: SUB_TOKEN.id,
      toTokenId: EVM_TOKEN.id,
      fromAmount,
      fromAddress: SUB_ADDRESS,
      toAddress,
      input: "exact",
    },
    env,
    signal
  )

const quoteEvmToSub = (fromAmount: bigint, toAddress: string | null = SUB_ADDRESS) =>
  bittensorEvmSwapModule.getQuote(
    {
      fromTokenId: EVM_TOKEN.id,
      toTokenId: SUB_TOKEN.id,
      fromAmount,
      fromAddress: EVM_ADDRESS,
      toAddress,
      input: "exact",
    },
    env,
    signal
  )

const single = <T>(quote: T | T[] | null) => (Array.isArray(quote) ? quote[0] : quote)

const fakeSapi = { getExtrinsicPayload: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetStorage.mockResolvedValue({ data: { free: 0n } })
  mockGetFeeEstimate.mockResolvedValue(FEE_RAO)
  mockEstimateGas.mockResolvedValue(21_000n)
  mockGetGasPrice.mockResolvedValue(10_000_000_000n)
  fakeSapi.getExtrinsicPayload.mockImplementation(
    async (pallet: string, method: string, args: unknown) => ({
      payload: { pallet, method, args },
      txMetadata: new Uint8Array([1]),
    })
  )
})

describe("bittensorEvmSwapModule assets", () => {
  it("lists both sides of both networks as sources", async () => {
    const assets = await bittensorEvmSwapModule.getFromAssets(signal)

    expect(assets).toEqual(
      expect.arrayContaining([
        "bittensor:substrate-native",
        "964:evm-native",
        "bittensor-testnet:substrate-native",
        "945:evm-native",
      ])
    )
  })

  it("pairs each source with its sibling only", async () => {
    expect(await bittensorEvmSwapModule.getToAssets("bittensor:substrate-native", signal)).toEqual([
      "964:evm-native",
    ])
    expect(await bittensorEvmSwapModule.getToAssets("945:evm-native", signal)).toEqual([
      "bittensor-testnet:substrate-native",
    ])
    expect(await bittensorEvmSwapModule.getToAssets("1:evm-native", signal)).toEqual([])
  })
})

describe("bittensorEvmSwapModule getQuote substrate -> evm", () => {
  it("returns null for an unsupported pair", async () => {
    const quote = await bittensorEvmSwapModule.getQuote(
      {
        fromTokenId: SUB_TOKEN.id,
        toTokenId: "1:evm-native",
        fromAmount: ONE_TAO_RAO,
        fromAddress: SUB_ADDRESS,
        toAddress: null,
        input: "exact",
      },
      env,
      signal
    )

    expect(quote).toBeNull()
  })

  it("retains the existential deposit for a fresh mirror and scales to wei", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))

    expect(quote?.protocol).toBe("bittensor-evm")
    expect(quote?.inputAmountBN).toBe(ONE_TAO_RAO)
    expect(quote?.outputAmountBN).toBe((ONE_TAO_RAO - ED) * WEI_PER_RAO)
    expect(quote?.note).toContain("existential deposit")
    expect(quote?.fees).toEqual([
      expect.objectContaining({ tokenId: SUB_TOKEN.id, name: "Est. Gas Fees" }),
    ])
    expect(quote?.fees[0]?.amount.toString()).toBe("0.0001")
    expect(mockGetStorage).toHaveBeenCalledWith("System", "Account", [
      frontierH160ToSs58Mirror(EVM_ADDRESS, 42),
    ])
  })

  it("does not retain the existential deposit for a funded mirror", async () => {
    mockGetStorage.mockResolvedValue({ data: { free: ED } })

    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))

    expect(quote?.outputAmountBN).toBe(ONE_TAO_RAO * WEI_PER_RAO)
    expect(quote?.note).toBeUndefined()
  })

  it("assumes a fresh mirror when the recipient is not known yet", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO, null))

    expect(quote?.outputAmountBN).toBe((ONE_TAO_RAO - ED) * WEI_PER_RAO)
    expect(mockGetStorage).not.toHaveBeenCalled()
  })

  it("assumes a fresh mirror when the balance read fails", async () => {
    mockGetStorage.mockRejectedValue(new Error("rpc down"))

    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))

    expect(quote?.outputAmountBN).toBe((ONE_TAO_RAO - ED) * WEI_PER_RAO)
  })

  it("requires a fresh mirror to receive at least the existential deposit on top of the retained one", async () => {
    await expect(quoteSubToEvm(2n * ED - 1n)).rejects.toThrow(/minimum is 0.000001 TAO/)

    const quote = single(await quoteSubToEvm(2n * ED))
    expect(quote?.outputAmountBN).toBe(ED * WEI_PER_RAO)
  })

  it("requires a funded mirror to receive at least the existential deposit", async () => {
    mockGetStorage.mockResolvedValue({ data: { free: ED } })

    await expect(quoteSubToEvm(ED - 1n)).rejects.toThrow(/minimum is 0.0000005 TAO/)
    await expect(quoteSubToEvm(ED)).resolves.toBeTruthy()
  })

  it("quotes one leg from the sender to the recipient", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))

    expect(quote?.legs).toEqual([
      {
        protocol: "bittensor-evm",
        fromTokenId: SUB_TOKEN.id,
        toTokenId: EVM_TOKEN.id,
        signer: SUB_ADDRESS,
        recipient: EVM_ADDRESS,
        inputAmount: ONE_TAO_RAO,
        outputAmount: (ONE_TAO_RAO - ED) * WEI_PER_RAO,
        fees: [
          { name: "Est. Gas Fees", gas: true, tokenId: SUB_TOKEN.id, amount: BigNumber("0.0001") },
        ],
        timeInSec: 12,
        data: { edHeldRao: "500" },
      },
    ])
  })
})

describe("bittensorEvmSwapModule getQuote evm -> substrate", () => {
  it("floors wei to whole rao", async () => {
    const dust = 123_456_789n
    const quote = single(await quoteEvmToSub(ONE_TAO_WEI + dust))

    expect(quote?.inputAmountBN).toBe(ONE_TAO_WEI + dust)
    expect(quote?.outputAmountBN).toBe(ONE_TAO_RAO)
    expect(quote?.note).toBeUndefined()
  })

  it("estimates gas against the precompile and reports it in EVM TAO", async () => {
    const quote = single(await quoteEvmToSub(ONE_TAO_WEI))

    expect(mockEstimateGas).toHaveBeenCalledWith(
      expect.objectContaining({
        account: EVM_ADDRESS,
        to: BITTENSOR_BALANCE_TRANSFER_PRECOMPILE,
        value: ONE_TAO_WEI,
      })
    )
    expect(quote?.fees).toEqual([
      expect.objectContaining({ tokenId: EVM_TOKEN.id, name: "Est. Gas Fees" }),
    ])
    // 21000 gas * 10 gwei = 0.00021 TAO
    expect(quote?.fees[0]?.amount.toString()).toBe("0.00021")
  })

  it("requires the recipient to receive at least the existential deposit", async () => {
    const minimum = ED * WEI_PER_RAO

    await expect(quoteEvmToSub(minimum - 1n)).rejects.toThrow(/minimum is 0.0000005 TAO/)
    await expect(quoteEvmToSub(minimum)).resolves.toBeTruthy()
  })

  it("still quotes when gas estimation fails", async () => {
    mockEstimateGas.mockRejectedValue(new Error("boom"))

    const quote = single(await quoteEvmToSub(ONE_TAO_WEI))

    expect(quote?.outputAmountBN).toBe(ONE_TAO_RAO)
    expect(quote?.fees).toEqual([])
  })
})

describe("bittensorEvmSwapModule buildLeg substrate -> evm", () => {
  const buildSubLeg = async (allowReap?: boolean, recipient: string | null = EVM_ADDRESS) => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO, recipient))
    if (!quote) throw new Error("expected a quote")
    return bittensorEvmSwapModule.buildLeg(
      {
        leg: quote.legs[0],
        input: ONE_TAO_RAO,
        context: { platform: "polkadot", sapi: fakeSapi as never, allowReap },
        slippage: 0,
      },
      env
    )
  }

  it("builds a keep-alive transfer to the mirror account", async () => {
    const { transaction } = await buildSubLeg()

    expect(transaction.platform).toBe("polkadot")
    expect(fakeSapi.getExtrinsicPayload).toHaveBeenCalledWith(
      "Balances",
      "transfer_keep_alive",
      {
        dest: { type: "Id", value: frontierH160ToSs58Mirror(EVM_ADDRESS, 42) },
        value: ONE_TAO_RAO,
      },
      { address: SUB_ADDRESS }
    )
  })

  it("allows reaping the sender when the context asks for it", async () => {
    await buildSubLeg(true)

    expect(fakeSapi.getExtrinsicPayload).toHaveBeenCalledWith(
      "Balances",
      "transfer_allow_death",
      expect.anything(),
      expect.anything()
    )
  })

  it("rejects a quote without a recipient", async () => {
    await expect(buildSubLeg(false, null)).rejects.toThrow("Please select the quote again")
  })

  it("rejects a mismatched context", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))
    if (!quote) throw new Error("expected a quote")

    await expect(
      bittensorEvmSwapModule.buildLeg(
        {
          leg: quote.legs[0],
          input: ONE_TAO_RAO,
          context: { platform: "ethereum" },
          slippage: 0,
        },
        env
      )
    ).rejects.toThrow("Missing substrate context")
  })
})

describe("bittensorEvmSwapModule buildLeg evm -> substrate", () => {
  const buildEvmLeg = async (fromAmount: bigint) => {
    const quote = single(await quoteEvmToSub(fromAmount))
    if (!quote) throw new Error("expected a quote")
    const { transaction } = await bittensorEvmSwapModule.buildLeg(
      {
        leg: quote.legs[0],
        input: fromAmount,
        context: { platform: "ethereum" },
        slippage: 0,
      },
      env
    )
    if (transaction.platform !== "ethereum") throw new Error("unexpected platform")
    return transaction.transaction
  }

  it("calls the precompile with the recipient public key and the value in wei", async () => {
    const transaction = await buildEvmLeg(ONE_TAO_WEI)

    expect(transaction.to).toBe(BITTENSOR_BALANCE_TRANSFER_PRECOMPILE)
    expect(transaction.value).toBe(ONE_TAO_WEI)
    expect(transaction.data).toBe(
      encodeFunctionData({
        abi: abiBittensorBalanceTransfer,
        functionName: "transfer",
        args: [SUB_PUBKEY],
      })
    )
    expect(transaction.data?.startsWith("0xcd6f4eb1")).toBe(true)
  })

  it("strips sub-rao dust from the value", async () => {
    const transaction = await buildEvmLeg(ONE_TAO_WEI + 999n)

    expect(transaction.value).toBe(ONE_TAO_WEI)
  })
})

describe("bittensorEvmSwapModule observeLeg substrate -> evm", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const SENT_HASH = `0x${"aa".repeat(32)}` as const
  const HEAD_HASH = `0x${"ff".repeat(32)}` as const
  const MIRROR = frontierH160ToSs58Mirror(EVM_ADDRESS, 42)
  const OUTPUT_WEI = (ONE_TAO_RAO - ED) * WEI_PER_RAO
  const TRANSFER: ExtrinsicEvents["events"][number] = {
    pallet: "Balances",
    name: "Transfer",
    value: { from: SUB_ADDRESS, to: MIRROR, amount: ONE_TAO_RAO },
  }
  const blockHashOf = (number: number) =>
    `0x${"b".repeat(60)}${number.toString().padStart(4, "0")}` as const

  type Finney = {
    finalised: number
    /** null: the signer has no account at the head, reaped by its own transfer */
    nonce: number | null
    blocks?: Record<number, { success: boolean; events: ExtrinsicEvents["events"] }>
    pruned?: boolean
    /** blocks the node cannot read: their events fail to decode */
    unreadable?: number[]
    /** blocks the node does not know yet: no hash for their number */
    unknown?: number[]
    balance?: bigint
    /** how long the node takes to answer for each block */
    msPerBlock?: number
  }

  const finney = ({
    finalised,
    nonce,
    blocks = {},
    pruned = false,
    unreadable = [],
    unknown = [],
    balance = 0n,
    msPerBlock = 0,
  }: Finney) => {
    mockSubstrateSend.mockImplementation(async (_networkId, method, params) => {
      switch (method) {
        case "chain_getFinalizedHead":
          return HEAD_HASH
        case "chain_getHeader":
          return params[0] === HEAD_HASH ? { number: `0x${finalised.toString(16)}` } : null
        case "chain_getBlockHash":
          return unknown.includes(params[0] as number) ? null : blockHashOf(params[0] as number)
        default:
          throw new Error(`unexpected ${method}`)
      }
    })
    mockGetStorage.mockImplementation(async (_pallet, _entry, _keys, at) =>
      at === HEAD_HASH ? (nonce === null ? null : { nonce }) : { data: { free: 0n } }
    )
    mockDecodeEvents.mockImplementation(async (_networkId, blockHash: string, hash: string) => {
      const number = Number(blockHash.slice(-4))
      if (msPerBlock) vi.setSystemTime(Date.now() + msPerBlock)
      if (pruned || unreadable.includes(number)) throw new Error("State already discarded")
      const block = blocks[number]
      return block && hash === SENT_HASH ? { blockNumber: number, ...block } : null
    })
    mockGetBalance.mockResolvedValue(balance)
  }

  const sentLeg = (row: WalletTransaction | null = null): SentLeg => ({
    hash: SENT_HASH,
    nonce: 7,
    sentAt: 0,
    evidence: { platform: "polkadot", era: { birth: 100, period: 64 } },
    row,
  })

  const successRow = (blockNumber: string) =>
    ({ platform: "polkadot", status: "success", blockNumber }) as WalletTransaction

  const observe = async (sent: SentLeg) => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))
    if (!quote) throw new Error("expected a quote")
    mockDecodeEvents.mockClear()
    return bittensorEvmSwapModule.observeLeg({ leg: quote.legs[0], sent, handsOver: true }, env)
  }

  it("lands with the transferred amount minus the retained deposit once finalised", async () => {
    finney({ finalised: 110, nonce: 8, blocks: { 105: { success: true, events: [TRANSFER] } } })

    expect(await observe(sentLeg())).toEqual({
      status: "landed",
      hash: SENT_HASH,
      amount: OUTPUT_WEI,
    })
    expect(mockDecodeEvents).toHaveBeenCalledTimes(6)
  })

  it("checks the row's block first when the row says success", async () => {
    finney({ finalised: 110, nonce: 8, blocks: { 105: { success: true, events: [TRANSFER] } } })

    expect(await observe(sentLeg(successRow("105")))).toEqual({
      status: "landed",
      hash: SENT_HASH,
      amount: OUTPUT_WEI,
    })
    expect(mockDecodeEvents).toHaveBeenCalledTimes(1)
    expect(mockDecodeEvents).toHaveBeenCalledWith("bittensor", blockHashOf(105), SENT_HASH)
  })

  it("scans the rest of the era when the row's block does not hold the extrinsic", async () => {
    finney({ finalised: 130, nonce: 8, blocks: { 120: { success: true, events: [TRANSFER] } } })

    expect(await observe(sentLeg(successRow("105")))).toEqual({
      status: "landed",
      hash: SENT_HASH,
      amount: OUTPUT_WEI,
    })
    expect(mockDecodeEvents).toHaveBeenNthCalledWith(1, "bittensor", blockHashOf(105), SENT_HASH)
  })

  it("stays pending while the nonce is unused and the era alive, without scanning", async () => {
    finney({ finalised: 120, nonce: 7 })

    expect(await observe(sentLeg())).toEqual({ status: "pending" })
    expect(mockDecodeEvents).not.toHaveBeenCalled()
  })

  it("stays pending while the row's block is past the finalised head", async () => {
    finney({ finalised: 120, nonce: 7, blocks: { 130: { success: true, events: [TRANSFER] } } })

    expect(await observe(sentLeg(successRow("130")))).toEqual({ status: "pending" })
  })

  it("scans the era when the signer was reaped by its whole-balance transfer", async () => {
    finney({ finalised: 164, nonce: null, blocks: { 105: { success: true, events: [TRANSFER] } } })

    expect(await observe(sentLeg())).toEqual({
      status: "landed",
      hash: SENT_HASH,
      amount: OUTPUT_WEI,
    })
  })

  it("scans the era when the signer was reaped and its account created again", async () => {
    finney({ finalised: 164, nonce: 0, blocks: { 105: { success: true, events: [TRANSFER] } } })

    expect(await observe(sentLeg())).toEqual({
      status: "landed",
      hash: SENT_HASH,
      amount: OUTPUT_WEI,
    })
  })

  it("is dropped once the era is dead, the nonce still unused and the whole era read", async () => {
    finney({ finalised: 164, nonce: 7 })

    expect(await observe(sentLeg())).toEqual({ status: "dropped" })
    expect(mockDecodeEvents).toHaveBeenCalledTimes(64)
  })

  it("stays pending when the nonce is unused but a block of the dead era is unreadable", async () => {
    finney({ finalised: 164, nonce: 7, unreadable: [130] })

    expect(await observe(sentLeg())).toMatchObject({ status: "pending" })
  })

  it("leaves a scan of a slow node incomplete once it ran out of time, pending", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    finney({ finalised: 200, nonce: 8, msPerBlock: 10_000 })

    expect(await observe(sentLeg())).toMatchObject({ status: "pending" })
    expect(mockDecodeEvents.mock.calls.length).toBeLessThan(10)
  })

  const observeUntilSettled = async (sent: SentLeg) => {
    const observations: LegObservation[] = []
    let evidence = sent.evidence
    while (observations.length < 64) {
      const observation = await observe({ ...sent, evidence })
      observations.push(observation)
      if (observation.status !== "pending") break
      if (evidence.platform === "polkadot")
        evidence = {
          ...evidence,
          scanned: [...(evidence.scanned ?? []), ...(observation.scanned ?? [])],
        }
    }
    return observations
  }

  it("carries a slow node's scan over to the next observation until it finds the extrinsic", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const blocks = { 105: { success: true, events: [TRANSFER] } }
    finney({ finalised: 200, nonce: 8, msPerBlock: 10_000, blocks })

    const observations = await observeUntilSettled(sentLeg())

    expect(observations.at(-1)).toEqual({ status: "landed", hash: SENT_HASH, amount: OUTPUT_WEI })
    expect(observations.length).toBe(20)
  })

  it("proves a dead era holds no extrinsic once a slow node's scans covered all of it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    finney({ finalised: 200, nonce: 8, msPerBlock: 10_000 })

    const observations = await observeUntilSettled(sentLeg())

    expect(observations.at(-1)).toEqual({ status: "failed", reason: "indeterminate" })
    expect(observations.length).toBe(22)
  })

  it("never counts a block it could not read, or did not know, as scanned", async () => {
    finney({ finalised: 200, nonce: 8, unreadable: [130], unknown: [140] })

    const first = await observe(sentLeg())
    expect(first.status).toBe("pending")
    const scanned = first.status === "pending" ? (first.scanned ?? []) : []
    expect(scanned).toHaveLength(62)
    expect(scanned).not.toContain(130)
    expect(scanned).not.toContain(140)

    finney({ finalised: 200, nonce: 8 })
    const leg = sentLeg()
    expect(
      await observe({
        ...leg,
        evidence: { platform: "polkadot", era: { birth: 100, period: 64 }, scanned },
      })
    ).toEqual({ status: "failed", reason: "indeterminate" })
    expect(mockDecodeEvents.mock.calls.map(([, blockHash]) => blockHash)).toEqual([
      blockHashOf(140),
      blockHashOf(130),
    ])
  })

  it("reads a block that holds the extrinsic again once its outcome is readable, and lands", async () => {
    const blocks = { 105: { success: true, events: [TRANSFER] } }
    finney({ finalised: 200, nonce: 8, blocks, unreadable: [105] })

    const first = await observe(sentLeg())
    const scanned = first.status === "pending" ? (first.scanned ?? []) : []
    expect(first.status).toBe("pending")
    expect(scanned).not.toContain(105)

    finney({ finalised: 200, nonce: 8, blocks })
    const evidence = { platform: "polkadot", era: { birth: 100, period: 64 }, scanned } as const
    expect(await observe({ ...sentLeg(), evidence })).toEqual({
      status: "landed",
      hash: SENT_HASH,
      amount: OUTPUT_WEI,
    })
    expect(mockDecodeEvents).toHaveBeenCalledTimes(1)
  })

  it("fails as reverted on ExtrinsicFailed", async () => {
    finney({ finalised: 110, nonce: 8, blocks: { 105: { success: false, events: [] } } })

    expect(await observe(sentLeg())).toEqual({
      status: "failed",
      reason: "reverted",
      hash: SENT_HASH,
    })
  })

  it("stays pending while the era lives and its state is pruned", async () => {
    finney({ finalised: 110, nonce: 8, pruned: true })

    expect(await observe(sentLeg())).toEqual({ status: "pending", scanned: [] })
  })

  it("stays pending when the era is dead and its state is pruned, for the deadline to decide", async () => {
    finney({ finalised: 200, nonce: 8, pruned: true })

    expect(await observe(sentLeg())).toEqual({ status: "pending", scanned: [] })
  })

  it("keeps reading a dead era past a block it could not read, and lands once it can", async () => {
    const blocks = { 105: { success: true, events: [TRANSFER] } }
    finney({ finalised: 200, nonce: 8, blocks, unreadable: [105] })
    expect(await observe(sentLeg())).toMatchObject({ status: "pending" })

    finney({ finalised: 200, nonce: 8, blocks })
    expect(await observe(sentLeg())).toEqual({
      status: "landed",
      hash: SENT_HASH,
      amount: OUTPUT_WEI,
    })
  })

  it("stays pending when the node does not know a block of the dead era yet", async () => {
    finney({ finalised: 200, nonce: 8, unknown: [140] })

    expect(await observe(sentLeg())).toMatchObject({ status: "pending" })
  })

  it("is indeterminate when the era is dead and the whole era was read without the extrinsic", async () => {
    finney({ finalised: 200, nonce: 8 })

    expect(await observe(sentLeg())).toEqual({ status: "failed", reason: "indeterminate" })
    expect(mockDecodeEvents).toHaveBeenCalledTimes(64)
  })

  it("never lands on a deposit to the recipient without the leg's extrinsic", async () => {
    finney({ finalised: 200, nonce: 8, balance: OUTPUT_WEI })

    expect(await observe(sentLeg())).toEqual({ status: "failed", reason: "indeterminate" })
  })

  it("stays pending when the nonce moved but the extrinsic is not in the era yet", async () => {
    finney({ finalised: 110, nonce: 8 })

    expect(await observe(sentLeg())).toMatchObject({ status: "pending" })
  })
})

describe("bittensorEvmSwapModule observeLeg evm -> substrate", () => {
  it("lands with the value in rao on a successful receipt", async () => {
    mockGetBlock.mockResolvedValue({ number: 490n })
    mockGetTransactionReceipt.mockResolvedValue({ status: "success", blockNumber: 490n })
    mockGetTransactionCount.mockResolvedValue(13)
    mockGetTransaction.mockResolvedValue({ input: "0x", value: ONE_TAO_WEI })
    const quote = single(await quoteEvmToSub(ONE_TAO_WEI))
    if (!quote) throw new Error("expected a quote")

    const observation = await bittensorEvmSwapModule.observeLeg(
      {
        leg: quote.legs[0],
        handsOver: true,
        sent: {
          hash: `0x${"cc".repeat(32)}`,
          nonce: 12,
          sentAt: 0,
          evidence: { platform: "ethereum" },
          row: null,
        },
      },
      env
    )

    expect(observation).toEqual({
      status: "landed",
      hash: `0x${"cc".repeat(32)}`,
      amount: ONE_TAO_RAO,
    })
  })
})
