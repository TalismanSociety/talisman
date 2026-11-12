import type { Balance, Balances } from "@talismn/balances"
import type { Token } from "@talismn/chaindata-provider"
import type { ScaleApi } from "@talismn/sapi"
import { TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR } from "@ui/domains/Staking/Bittensor/utils/constants"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { quoteLegsKey } from "../../buildSwapTransaction"
import { bittensorDTaoSwapModule, getDTaoLegData } from "../bittensor-dtao-swap-module"
import bittensorLogo from "../bittensor-logo.svg?url"
import type { BaseQuote, BittensorSwapConfig, QuoteParams, SwapEnv } from "../common.swap-module"

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const OTHER_ADDRESS = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const YUMA = "5HEo565WAy4Dbq3Sv271SAi7syBSofyfhhwRNjFNSM2gP9M2"
const SUBNET_DEFAULT = "5F4tQyWrhfGVcNhoqeiNsR6KjD4wMZ2kfhLj4oHYuyHbZAc3"
const HELD = "5Hddm3iBFD2GLT5ik7LZnT3XJUnRnN8PoeCFgGQgawUVKNm8"
const PICKED = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"

const TAO = "bittensor:substrate-native"
const SN64 = "bittensor:substrate-dtao:64"
const SN64_HELD = `bittensor:substrate-dtao:64:${HELD}`
const ROOT = "bittensor:substrate-dtao:0"
const ROOT_HELD = `bittensor:substrate-dtao:0:${HELD}`

const dtao = (id: string, netuid: number, hotkey?: string) => ({
  id,
  type: "substrate-dtao",
  platform: "polkadot",
  networkId: "bittensor",
  symbol: netuid ? "α" : "TAO",
  decimals: 9,
  netuid,
  hotkey,
})

const TOKENS = [
  {
    id: TAO,
    type: "substrate-native",
    platform: "polkadot",
    networkId: "bittensor",
    symbol: "TAO",
  },
  dtao(SN64, 64),
  dtao(SN64_HELD, 64, HELD),
  dtao(ROOT, 0),
  dtao(ROOT_HELD, 0, HELD),
  { id: "polkadot:substrate-native", type: "substrate-native", networkId: "polkadot" },
] as unknown as Token[]

const ONE_TAO = 1_000_000_000n
const GAS_FEE = 100_000n
const MIN_STAKE = 2_000_000n
const EXISTENTIAL_DEPOSIT = 500n

let alphaPerTao = 50n
const config: BittensorSwapConfig = {
  remote: {
    fee: { buy: null, sell: null },
    featuredValidators: [YUMA],
    defaultValidatorsBySubnet: { "64": SUBNET_DEFAULT },
  },
  seekDiscount: 0,
}
let heldStake: Balance[] = []
let freeTao = 0n

const getRuntimeCallValue = vi.fn(async (_api: string, method: string, [, amount]: bigint[]) => {
  switch (method) {
    case "current_alpha_price":
      return ONE_TAO / alphaPerTao
    case "sim_swap_tao_for_alpha":
      return { tao_amount: amount, alpha_amount: amount * alphaPerTao, tao_fee: 0n, alpha_fee: 0n }
    case "sim_swap_alpha_for_tao":
      return { tao_amount: amount / alphaPerTao, alpha_amount: amount, tao_fee: 0n, alpha_fee: 0n }
    default:
      throw new Error(`Unexpected runtime call ${method}`)
  }
})

const sapi = {
  getRuntimeCallValue,
  getConstant: (_pallet: string, constant: string) =>
    constant === "ExistentialDeposit" ? EXISTENTIAL_DEPOSIT : MIN_STAKE,
  getStorage: async () => ({ data: { free: freeTao } }),
  getFeeEstimate: vi.fn(async () => GAS_FEE),
  getDecodedCall: (pallet: string, method: string, args: unknown) => ({ pallet, method, args }),
  getExtrinsicPayload: vi.fn(
    async (pallet: string, method: string, args: unknown, { address }: { address: string }) => ({
      payload: { pallet, method, args, address },
      txMetadata: new Uint8Array([1]),
    })
  ),
} as unknown as ScaleApi

const env = {
  getToken: async (id) => TOKENS.find((token) => token.id === id) ?? null,
  getTokensMap: (async () =>
    Object.fromEntries(TOKENS.map((token) => [token.id, token]))) as SwapEnv["getTokensMap"],
  substrateApi: async () => sapi,
  evmClient: (async () => ({
    getGasPrice: async () => 10_000_000_000n,
    estimateGas: async () => 21_000n,
  })) as unknown as SwapEnv["evmClient"],
  getBittensorConfig: async () => config,
  getBalances: async () => ({ each: heldStake }) as unknown as Balances,
} satisfies Partial<SwapEnv> as unknown as SwapEnv

const stake = (netuid: number, hotkey: string, free: bigint, address = ADDRESS) =>
  ({
    token: { type: "substrate-dtao", networkId: "bittensor", netuid, hotkey },
    address,
    free: { planck: free },
  }) as unknown as Balance

const signal = new AbortController().signal

const getQuote = async (params: Partial<QuoteParams> = {}) => {
  const quote = await bittensorDTaoSwapModule.getQuote(
    {
      fromTokenId: TAO,
      toTokenId: SN64,
      fromAmount: ONE_TAO,
      fromAddress: ADDRESS,
      toAddress: ADDRESS,
      input: "exact",
      ...params,
    },
    env,
    signal
  )
  return quote as BaseQuote | null
}

const quoteOrThrow = async (params?: Partial<QuoteParams>) => {
  const quote = await getQuote(params)
  if (!quote) throw new Error("expected a quote")
  return quote
}

const stakeTao = (params?: Partial<QuoteParams>) => quoteOrThrow(params)
const unstakeAlpha = (params?: Partial<QuoteParams>) =>
  quoteOrThrow({ fromTokenId: SN64_HELD, toTokenId: TAO, fromAmount: 50n * ONE_TAO, ...params })

const feesOf = (quote: BaseQuote) =>
  Object.fromEntries(quote.fees.map((fee) => [fee.name, fee.amount.toString()]))

type Call = { pallet: string; method: string; args: Record<string, unknown> }

const build = async (quote: BaseQuote, { input = quote.inputAmountBN, slippage = 0.005 } = {}) => {
  const built = await bittensorDTaoSwapModule.buildLeg(
    {
      leg: quote.legs[0],
      input,
      context: { platform: "polkadot", sapi },
      slippage,
      exchange: null,
    },
    env
  )
  if (built.transaction.platform !== "polkadot") throw new Error("expected a substrate transaction")
  const batch = built.transaction.payload as unknown as Call & { address: string }
  expect([batch.pallet, batch.method]).toEqual(["Utility", "batch_all"])
  const calls = batch.args.calls as Call[]
  return {
    built,
    signer: batch.address,
    calls,
    methods: calls.map((call) => `${call.pallet}.${call.method}`),
  }
}

const remarkOf = (call: Call) => new TextDecoder().decode(call.args.remark as Uint8Array)

beforeEach(() => {
  vi.clearAllMocks()
  alphaPerTao = 50n
  config.remote.fee = { buy: null, sell: null }
  config.remote.featuredValidators = [YUMA]
  config.seekDiscount = 0
  heldStake = []
  freeTao = 0n
})

describe("bittensorDTaoSwapModule assets", () => {
  it("lists TAO and every held position as a source, but no bare subnet", async () => {
    expect(await bittensorDTaoSwapModule.getFromAssets(env, signal)).toEqual([
      TAO,
      SN64_HELD,
      ROOT_HELD,
    ])
  })

  it("offers every subnet and held position of the network for TAO", async () => {
    expect(await bittensorDTaoSwapModule.getToAssets(TAO, env, signal)).toEqual([
      SN64,
      SN64_HELD,
      ROOT,
      ROOT_HELD,
    ])
  })

  it("offers TAO for a held position, and nothing for a bare subnet or another token", async () => {
    expect(await bittensorDTaoSwapModule.getToAssets(SN64_HELD, env, signal)).toEqual([TAO])
    expect(await bittensorDTaoSwapModule.getToAssets(SN64, env, signal)).toEqual([])
    expect(
      await bittensorDTaoSwapModule.getToAssets("polkadot:substrate-native", env, signal)
    ).toEqual([])
  })

  it("lists both sides before a source is chosen", async () => {
    expect(await bittensorDTaoSwapModule.getToAssets(null, env, signal)).toEqual([
      TAO,
      SN64,
      SN64_HELD,
      ROOT,
      ROOT_HELD,
    ])
  })
})

describe("bittensorDTaoSwapModule getQuote", () => {
  it("gives no quote for a pair it does not trade", async () => {
    expect(await getQuote({ toTokenId: "1:evm-native" })).toBeNull()
    expect(await getQuote({ fromTokenId: SN64, toTokenId: TAO })).toBeNull()
    expect(await getQuote({ fromTokenId: SN64_HELD, toTokenId: ROOT })).toBeNull()
    expect(await getQuote({ fromTokenId: "polkadot:substrate-native" })).toBeNull()
    expect(await getQuote({ fromAmount: null })).toBeNull()
  })

  it("refuses another recipient: stake stays with the account that signs", async () => {
    await expect(getQuote({ toAddress: OTHER_ADDRESS })).rejects.toThrow(
      "Choose it as the recipient"
    )
  })

  it("is shown as Bittensor", async () => {
    const quote = await stakeTao()

    expect(quote.protocol).toBe("bittensor-dtao")
    expect(quote.providerName).toBe("Bittensor")
    expect(quote.providerLogo).toBe(bittensorLogo)
  })

  it("quotes a stake: 0.3% Talisman fee off the TAO, the rest through the pool", async () => {
    const quote = await stakeTao()

    expect(quote.inputAmountBN).toBe(ONE_TAO)
    expect(quote.outputAmountBN).toBe(997_000_000n * 50n)
    expect(feesOf(quote)).toEqual({ "Talisman Fee": "0.003", "Est. Gas Fees": "0.0001" })
    expect(quote.fees.every((fee) => fee.tokenId === TAO)).toBe(true)
    expect(quote.fees.find((fee) => fee.name === "Est. Gas Fees")?.gas).toBe(true)
    expect(quote.talismanFee).toBe(0.003)
  })

  it("quotes an unstake: the pool's TAO less 0.3% Talisman fee", async () => {
    const quote = await unstakeAlpha()

    expect(quote.inputAmountBN).toBe(50n * ONE_TAO)
    expect(quote.outputAmountBN).toBe(997_000_000n)
    expect(feesOf(quote)).toEqual({ "Talisman Fee": "0.003", "Est. Gas Fees": "0.0001" })
  })

  it("charges the subnet's remote config rate instead of 0.3%", async () => {
    config.remote.fee = { buy: { "64": 0.1 }, sell: { "64": 1 } }

    expect(feesOf(await stakeTao())["Talisman Fee"]).toBe("0.001")
    expect(feesOf(await unstakeAlpha())["Talisman Fee"]).toBe("0.01")
  })

  it("lists no Talisman fee on a subnet whose fee is waived", async () => {
    config.remote.fee = { buy: { "64": 0 }, sell: null }

    const quote = await stakeTao()

    expect(feesOf(quote)).toEqual({ "Est. Gas Fees": "0.0001" })
    expect(quote.outputAmountBN).toBe(50n * ONE_TAO)
  })

  it("takes the SEEK discount off the fee", async () => {
    config.seekDiscount = 0.5

    expect(feesOf(await stakeTao())["Talisman Fee"]).toBe("0.0015")
  })

  it("still quotes without a sender, with no gas estimate", async () => {
    const quote = await stakeTao({ fromAddress: null, toAddress: null })

    expect(feesOf(quote)).toEqual({ "Talisman Fee": "0.003" })
  })

  it("still quotes when the gas estimate fails", async () => {
    vi.mocked(sapi.getFeeEstimate).mockRejectedValueOnce(new Error("rpc down"))

    expect(feesOf(await stakeTao())).toEqual({ "Talisman Fee": "0.003" })
  })

  it("refuses a stake below the chain minimum, fees included", async () => {
    await expect(stakeTao({ fromAmount: 2_006_017n })).rejects.toThrow(
      "Bittensor minimum is 0.002006018 TAO"
    )
    await expect(stakeTao({ fromAmount: 2_006_018n })).resolves.toBeTruthy()
  })

  it("refuses an unstake worth less than the chain minimum", async () => {
    await expect(unstakeAlpha({ fromAmount: 99_999_999n })).rejects.toThrow(
      "Bittensor minimum is 0.1 α"
    )
    await expect(unstakeAlpha({ fromAmount: 100_000_000n })).resolves.toBeTruthy()
  })

  it("carries the prices of the trade for the confirm screen", async () => {
    const [leg] = (await stakeTao()).legs

    expect(getDTaoLegData(leg)).toMatchObject({
      networkId: "bittensor",
      netuid: 64,
      alphaPrice: "20000000",
      swapPrice: "20000000",
      priceImpact: 0,
    })
    expect(JSON.parse(JSON.stringify(leg.data))).toEqual(leg.data)
  })
})

describe("bittensorDTaoSwapModule validator", () => {
  const validatorOf = async (params?: Partial<QuoteParams>) => {
    const data = getDTaoLegData((await quoteOrThrow(params)).legs[0])
    if (data?.direction !== "stake") throw new Error("expected a stake")
    return { hotkey: data.hotkey, validator: data.validator }
  }

  it("defaults to the first featured validator, never the subnet's default", async () => {
    expect(await validatorOf()).toEqual({ hotkey: YUMA, validator: "pickable" })
  })

  it("defaults to the sender's largest stake on the subnet", async () => {
    heldStake = [
      stake(64, SUBNET_DEFAULT, 10n),
      stake(64, HELD, 500n),
      stake(64, PICKED, 9_999n, OTHER_ADDRESS),
      stake(1, PICKED, 9_999n),
    ]

    expect(await validatorOf()).toEqual({ hotkey: HELD, validator: "pickable" })
  })

  it("takes the validator the user picked over any default", async () => {
    heldStake = [stake(64, HELD, 500n)]

    expect(await validatorOf({ stakeHotkey: PICKED })).toEqual({
      hotkey: PICKED,
      validator: "pickable",
    })
  })

  it("pins the validator of a held position, whatever was picked", async () => {
    expect(await validatorOf({ toTokenId: SN64_HELD, stakeHotkey: PICKED })).toEqual({
      hotkey: HELD,
      validator: "pinned",
    })
  })

  it("has none when nothing is featured and the sender holds no stake", async () => {
    config.remote.featuredValidators = []

    expect(await validatorOf()).toEqual({ hotkey: null, validator: "pickable" })
  })

  it("unstakes from the position's validator", async () => {
    const [leg] = (await unstakeAlpha({ stakeHotkey: PICKED })).legs

    expect(getDTaoLegData(leg)).toMatchObject({ direction: "unstake", hotkey: HELD })
  })

  it("a new validator makes a new quote to build from", async () => {
    expect(quoteLegsKey(await stakeTao())).toEqual(quoteLegsKey(await stakeTao()))
    expect(quoteLegsKey(await stakeTao())).not.toEqual(
      quoteLegsKey(await stakeTao({ stakeHotkey: PICKED }))
    )
  })
})

describe("bittensorDTaoSwapModule buildLeg", () => {
  it("stakes: Talisman fee, then add_stake_limit, then the swap remark", async () => {
    const { calls, methods, signer } = await build(await stakeTao())

    expect(signer).toBe(ADDRESS)
    expect(methods).toEqual([
      "Balances.transfer_keep_alive",
      "SubtensorModule.add_stake_limit",
      "System.remark_with_event",
    ])
    expect(calls[0].args).toEqual({
      dest: { type: "Id", value: TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR },
      value: 3_000_000n,
    })
    expect(calls[1].args).toEqual({
      hotkey: YUMA,
      netuid: 64,
      amount_staked: 997_000_000n,
      limit_price: 20_100_000n,
      allow_partial: false,
    })
    expect(remarkOf(calls[2])).toBe("garlic002")
  })

  it("unstakes: remove_stake_limit, then Talisman fee, then the swap remark", async () => {
    const { calls, methods, signer } = await build(await unstakeAlpha())

    expect(signer).toBe(ADDRESS)
    expect(methods).toEqual([
      "SubtensorModule.remove_stake_limit",
      "Balances.transfer_keep_alive",
      "System.remark_with_event",
    ])
    expect(calls[0].args).toEqual({
      hotkey: HELD,
      netuid: 64,
      amount_unstaked: 50n * ONE_TAO,
      limit_price: 19_900_000n,
      allow_partial: false,
    })
    expect(calls[1].args).toEqual({
      dest: { type: "Id", value: TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR },
      value: 3_000_000n,
    })
    expect(remarkOf(calls[2])).toBe("garlic002")
  })

  it("sets the limit price from the slippage the user chose", async () => {
    const quote = await stakeTao()

    expect((await build(quote, { slippage: 0.02 })).calls[1].args.limit_price).toBe(20_400_000n)
    expect((await build(quote, { slippage: 0 })).calls[1].args.limit_price).toBe(20_000_000n)
  })

  it("stakes to the validator the user picked", async () => {
    const { calls, built } = await build(await stakeTao({ stakeHotkey: PICKED }))

    expect(calls[1].args.hotkey).toBe(PICKED)
    expect(built.txInfo).toMatchObject({ hotkey: PICKED })
  })

  it("stakes to the validator of a held position", async () => {
    const { calls } = await build(await stakeTao({ toTokenId: SN64_HELD, stakeHotkey: PICKED }))

    expect(calls[1].args.hotkey).toBe(HELD)
  })

  it("prices the call on the pool as it is when built", async () => {
    const quote = await stakeTao()
    alphaPerTao = 40n

    const { calls, built } = await build(quote)

    expect(calls[1].args.limit_price).toBe(25_125_000n)
    expect(built.expectedOutput).toBe(997_000_000n * 40n)
    expect(built.acceptedOutput).toBe((quote.outputAmountBN * 995n) / 1000n)
  })

  it("reports what it expects when the pool has not moved", async () => {
    const quote = await stakeTao()
    const { built } = await build(quote)

    expect(built.expectedOutput).toBe(quote.outputAmountBN)
    expect(built.acceptedOutput).toBeUndefined()
    expect(Object.fromEntries(built.fees.map((fee) => [fee.name, fee.amount.toString()]))).toEqual({
      "Talisman Fee": "0.003",
      "Est. Gas Fees": "0.0001",
    })
  })

  it("records the swap for the transaction history", async () => {
    const { built } = await build(await unstakeAlpha())

    expect(built.txInfo).toEqual({
      type: "bittensor-staking",
      fromTokenId: SN64_HELD,
      toTokenId: TAO,
      fromAmount: (50n * ONE_TAO).toString(),
      toAmount: "997000000",
      hotkey: HELD,
    })
  })

  it("charges the subnet's remote config rate in the call", async () => {
    config.remote.fee = { buy: { "64": 0.1 }, sell: null }

    const { calls } = await build(await stakeTao())

    expect(calls[0].args.value).toBe(1_000_000n)
    expect(calls[1].args.amount_staked).toBe(999_000_000n)
  })

  it("refuses to build without a validator", async () => {
    config.remote.featuredValidators = []

    await expect(build(await stakeTao())).rejects.toThrow("Select a validator")
  })

  it("refuses a leg whose data is not its own", async () => {
    const quote = await stakeTao()
    const [leg] = quote.legs

    await expect(
      build({ ...quote, legs: [{ ...leg, data: { netuid: 64, hotkey: YUMA } }] })
    ).rejects.toThrow("Please select the quote again")
    await expect(
      build({ ...quote, legs: [{ ...leg, data: (await unstakeAlpha()).legs[0].data }] })
    ).rejects.toThrow("Please select the quote again")
  })

  it("refuses a context that is not substrate", async () => {
    const quote = await stakeTao()

    await expect(
      bittensorDTaoSwapModule.buildLeg(
        {
          leg: quote.legs[0],
          input: ONE_TAO,
          context: { platform: "ethereum" },
          slippage: 0.005,
          exchange: null,
        },
        env
      )
    ).rejects.toThrow("Missing substrate context")
  })
})

describe("bittensorDTaoSwapModule root", () => {
  it("quotes root 1:1 with no Talisman fee and without asking the pool", async () => {
    const quote = await stakeTao({ toTokenId: ROOT })

    expect(quote.outputAmountBN).toBe(ONE_TAO)
    expect(feesOf(quote)).toEqual({ "Est. Gas Fees": "0.0001" })
    expect(quote.talismanFee).toBe(0)
    expect(getDTaoLegData(quote.legs[0])).toMatchObject({ netuid: 0, hotkey: YUMA })
    expect(getRuntimeCallValue).not.toHaveBeenCalled()
  })

  it("stakes to root with add_stake and the swap remark only", async () => {
    const { calls, methods } = await build(await stakeTao({ toTokenId: ROOT }))

    expect(methods).toEqual(["SubtensorModule.add_stake", "System.remark_with_event"])
    expect(calls[0].args).toEqual({ hotkey: YUMA, netuid: 0, amount_staked: ONE_TAO })
    expect(remarkOf(calls[1])).toBe("garlic002")
  })

  it("unstakes from root with remove_stake and the swap remark only", async () => {
    const quote = await quoteOrThrow({ fromTokenId: ROOT_HELD, toTokenId: TAO })
    const { calls, methods } = await build(quote)

    expect(quote.outputAmountBN).toBe(ONE_TAO)
    expect(methods).toEqual(["SubtensorModule.remove_stake", "System.remark_with_event"])
    expect(calls[0].args).toEqual({ hotkey: HELD, netuid: 0, amount_unstaked: ONE_TAO })
  })
})
