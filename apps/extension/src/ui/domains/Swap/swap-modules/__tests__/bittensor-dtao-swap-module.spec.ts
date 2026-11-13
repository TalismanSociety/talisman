import type { Balance, Balances } from "@talismn/balances"
import type { Token } from "@talismn/chaindata-provider"
import type { ScaleApi } from "@talismn/sapi"
import { TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR } from "@ui/domains/Staking/Bittensor/utils/constants"
import type { Hex } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { quoteLegsKey } from "../../buildSwapTransaction"
import { bittensorDTaoSwapModule, getDTaoLegData } from "../bittensor-dtao-swap-module"
import { bittensorEvmSwapModule } from "../bittensor-evm-swap-module"
import bittensorLogo from "../bittensor-logo.svg?url"
import type {
  BaseQuote,
  BittensorSwapConfig,
  QuoteParams,
  SwapEnv,
  SwapModule,
  SwapModuleDefinition,
} from "../common.swap-module"
import { type IntermediateCandidate, withEntryHops } from "../hops"
import { type LegChain, legSettled, nextLegStep, startRun } from "../swap-run"

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const OTHER_ADDRESS = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const YUMA = "5HEo565WAy4Dbq3Sv271SAi7syBSofyfhhwRNjFNSM2gP9M2"
const SUBNET_DEFAULT = "5F4tQyWrhfGVcNhoqeiNsR6KjD4wMZ2kfhLj4oHYuyHbZAc3"
const HELD = "5Hddm3iBFD2GLT5ik7LZnT3XJUnRnN8PoeCFgGQgawUVKNm8"
const PICKED = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"

const TAO = "bittensor:substrate-native"
const EVM_TAO = "964:evm-native"
const EVM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
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
const WEI_PER_RAO = 1_000_000_000n

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

  it("refuses a first leg once the pool moved past the slippage: the screen still shows the quote", async () => {
    const stakeQuote = await stakeTao()
    const unstakeQuote = await unstakeAlpha()
    alphaPerTao = 40n
    await expect(build(stakeQuote)).rejects.toThrow("please select the quote again")
    alphaPerTao = 60n
    await expect(build(unstakeQuote)).rejects.toThrow("please select the quote again")
  })

  it("bounds a first leg by the price it was quoted, after the pool moved against it", async () => {
    const stakeQuote = await stakeTao()
    const unstakeQuote = await unstakeAlpha()

    alphaPerTao = 49n
    const staked = await build(stakeQuote, { slippage: 0.05 })
    expect(staked.calls[1].args.limit_price).toBe(21_000_000n)
    expect(staked.built.expectedOutput).toBe(997_000_000n * 49n)
    expect(staked.built.acceptedOutput).toBeUndefined()

    alphaPerTao = 51n
    const unstaked = await build(unstakeQuote, { slippage: 0.05 })
    expect(unstaked.calls[0].args.limit_price).toBe(19_000_000n)
    expect(unstaked.built.acceptedOutput).toBeUndefined()
  })

  it("signs the quoted price even when the pool moved in the user's favour", async () => {
    const stakeQuote = await stakeTao()
    alphaPerTao = 60n

    expect((await build(stakeQuote)).calls[1].args.limit_price).toBe(20_100_000n)
  })

  it("refuses a first leg that was quoted no price: its limit would bound nothing", async () => {
    const quote = await unstakeAlpha()
    const [leg] = quote.legs
    const unpriced = {
      ...quote,
      legs: [{ ...leg, data: { ...(leg.data as object), swapPrice: "0" } }],
    }

    await expect(build(unpriced as BaseQuote)).rejects.toThrow("Please select the quote again")
  })

  it("prices a later leg on the pool as it is when built", async () => {
    const quote = await stakeTao({ input: "upTo" })
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

describe("EVM TAO to a subnet, through TAO", () => {
  const HASH: Hex = `0x${"aa".repeat(32)}`
  const EVM_INPUT = ONE_TAO * WEI_PER_RAO + 123n

  const withEnv = ({
    getFromAssets,
    getToAssets,
    getQuote,
    buildLeg,
    settleLeg,
    createExchange: _,
    ...module
  }: SwapModuleDefinition): SwapModule => ({
    ...module,
    getFromAssets: (signal) => getFromAssets(env, signal),
    getToAssets: (fromTokenId, signal) => getToAssets(fromTokenId, env, signal),
    getQuote: (params, signal) => getQuote(params, env, signal),
    buildLeg: (params) => buildLeg(params, env),
    ...(settleLeg && { settleLeg: (params, signal) => settleLeg(params, env, signal) }),
  })
  const bridge = withEnv(bittensorEvmSwapModule)
  const staking = withEnv(bittensorDTaoSwapModule)

  const owned = (address: string, type: IntermediateCandidate["type"] = "keypair") => ({
    address,
    type,
    hubBalance: 0n,
  })
  const routed = (candidates: IntermediateCandidate[] = [owned(EVM_ADDRESS), owned(ADDRESS)]) =>
    withEntryHops(staking, {
      enabled: (flag) => flag === "SWAPS_MULTI_HOP",
      resolve: (protocol) => (protocol === "bittensor-evm" ? bridge : undefined),
      candidates: async () => candidates,
    })

  const quoteRoute = async (params: Partial<QuoteParams> = {}, module = routed()) =>
    (await module.getQuote(
      {
        fromTokenId: EVM_TAO,
        toTokenId: SN64,
        fromAmount: EVM_INPUT,
        fromAddress: EVM_ADDRESS,
        toAddress: ADDRESS,
        input: "exact",
        ...params,
      },
      signal
    )) as BaseQuote | null

  const routeOrThrow = async (params?: Partial<QuoteParams>) => {
    const quote = await quoteRoute(params)
    if (!quote) throw new Error("expected a route")
    return quote
  }

  const runWaitingOnStake = async (slippage = 0.01) => {
    const quote = await routeOrThrow()
    const sent = startRun(quote, slippage, { hash: HASH, input: EVM_INPUT })
    env.waitForTransaction = async () => ({ landed: true, hash: HASH })
    const outcome = await bridge.settleLeg?.(
      { leg: quote.legs[0], hash: HASH, input: EVM_INPUT },
      signal
    )
    if (!outcome) throw new Error("Bittensor EVM must settle its legs")
    return legSettled(sent, 0, outcome)
  }

  const substrate = (feeOnTop?: () => Promise<bigint>): LegChain => ({
    platform: "polkadot",
    sapi,
    feeOnTop,
  })

  const stakeStep = async (chain = substrate(), slippage?: number) => {
    const step = await nextLegStep({
      run: await runWaitingOnStake(slippage),
      index: 1,
      module: staking,
      chain,
    })
    if (step.signs !== "leg" || step.built.transaction.platform !== "polkadot")
      throw new Error("expected a substrate leg")
    const batch = step.built.transaction.payload as unknown as Call & { address: string }
    return { ...step, signer: batch.address, calls: batch.args.calls as Call[] }
  }

  it("offers EVM TAO as a source for every subnet of its network, behind the multi-hop flag", async () => {
    expect(await routed().getFromAssets(signal)).toEqual([
      TAO,
      SN64_HELD,
      ROOT_HELD,
      EVM_TAO,
      "945:evm-native",
    ])
    expect(await routed().getToAssets(EVM_TAO, signal)).toEqual([SN64, SN64_HELD, ROOT, ROOT_HELD])
    expect(await routed().getToAssets("945:evm-native", signal)).toEqual([])

    const unflagged = withEntryHops(staking, {
      enabled: () => false,
      resolve: () => bridge,
      candidates: async () => [owned(ADDRESS)],
    })
    expect(await unflagged.getToAssets(EVM_TAO, signal)).toEqual([])
    expect(await quoteRoute({}, unflagged)).toBeNull()
  })

  it("quotes two legs that chain: the TAO lands on the recipient, who stakes it", async () => {
    const quote = await routeOrThrow()

    expect(quote.legs.map((leg) => [leg.protocol, leg.fromTokenId, leg.toTokenId])).toEqual([
      ["bittensor-evm", EVM_TAO, TAO],
      ["bittensor-dtao", TAO, SN64],
    ])
    expect(quote.legs.map((leg) => [leg.signer, leg.recipient])).toEqual([
      [EVM_ADDRESS, ADDRESS],
      [ADDRESS, ADDRESS],
    ])
    expect(quote.inputAmountBN).toBe(EVM_INPUT)
    expect(quote.legs[0].outputAmount).toBe(ONE_TAO)
    expect(quote.legs[1].inputAmount).toBe(ONE_TAO)
    expect(quote.outputAmountBN).toBe(997_000_000n * 50n)
  })

  it("is shown as Bittensor, with the Talisman fee and the gas of both legs", async () => {
    const quote = await routeOrThrow()

    expect(quote.protocol).toBe("bittensor-dtao")
    expect(quote.subProtocol).toBe("via-bittensor-evm")
    expect(quote.providerName).toBe("Bittensor")
    expect(quote.providerLogo).toBe(bittensorLogo)
    expect(quote.fees.map((fee) => [fee.name, fee.tokenId, fee.amount.toString()])).toEqual([
      ["Est. Gas Fees", EVM_TAO, "0.00021"],
      ["Talisman Fee", TAO, "0.003"],
      ["Est. Gas Fees", TAO, "0.0001"],
    ])
    expect(JSON.parse(JSON.stringify(quote.legs[1].data))).toEqual(quote.legs[1].data)
  })

  it("stakes to the validator the user picked", async () => {
    const quote = await routeOrThrow({ stakeHotkey: PICKED })

    expect(getDTaoLegData(quote.legs[1])).toMatchObject({ hotkey: PICKED, validator: "pickable" })
  })

  it("offers no route to a recipient the wallet cannot sign for: the stake belongs to who signs", async () => {
    expect(await quoteRoute({ toAddress: OTHER_ADDRESS })).toBeNull()
    expect(await quoteRoute({ toAddress: EVM_ADDRESS })).toBeNull()
    expect(await quoteRoute({}, routed([owned(EVM_ADDRESS)]))).toBeNull()
  })

  it("routes through a hardware or Vault recipient", async () => {
    const quote = await quoteRoute(
      {},
      routed([owned(OTHER_ADDRESS), owned(ADDRESS, "polkadot-vault")])
    )

    expect(quote?.legs[1].signer).toBe(ADDRESS)
  })

  it("previews the route before a recipient is chosen", async () => {
    const quote = await routeOrThrow({ toAddress: null })

    expect(quote.legs.map((leg) => [leg.signer, leg.recipient])).toEqual([
      [EVM_ADDRESS, ADDRESS],
      [ADDRESS, null],
    ])
  })

  it("stakes what landed once the EVM leg did, at the run's slippage", async () => {
    freeTao = 5n * ONE_TAO

    const { input, built, fee, signer, calls } = await stakeStep()

    expect(input).toBe(ONE_TAO)
    expect(signer).toBe(ADDRESS)
    expect(calls.map((call) => `${call.pallet}.${call.method}`)).toEqual([
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
      limit_price: 20_200_000n,
      allow_partial: false,
    })
    expect(remarkOf(calls[2])).toBe("garlic002")
    expect(fee).toBe(GAS_FEE)
    expect(built.expectedOutput).toBe(997_000_000n * 50n)
    expect(built.acceptedOutput).toBeUndefined()
    expect(built.txInfo).toMatchObject({ type: "bittensor-staking", fromAmount: `${ONE_TAO}` })
  })

  it("leaves the fee and the existential deposit on an account that holds only what landed", async () => {
    freeTao = ONE_TAO

    const { input, built, calls } = await stakeStep(substrate(), 0)

    expect(input).toBe(ONE_TAO - EXISTENTIAL_DEPOSIT - GAS_FEE)
    expect((calls[0].args.value as bigint) + (calls[1].args.amount_staked as bigint)).toBe(input)
    expect(built.acceptedOutput).toBeUndefined()
  })

  it("leaves room for what the MEV shield charges on top", async () => {
    freeTao = ONE_TAO

    const { input, fee } = await stakeStep(substrate(async () => 40_000n))

    expect(fee).toBe(GAS_FEE + 40_000n)
    expect(input).toBe(ONE_TAO - EXISTENTIAL_DEPOSIT - GAS_FEE - 40_000n)
  })

  it("never spends the TAO a lock holds", async () => {
    freeTao = 3n * ONE_TAO
    vi.spyOn(sapi, "getStorage").mockResolvedValueOnce({
      data: { free: freeTao, frozen: 3n * ONE_TAO - 400_000_000n },
    })

    expect((await stakeStep()).input).toBe(400_000_000n - GAS_FEE)
  })

  it("warns of a pool that moved since the quote, on the TAO it stakes now", async () => {
    freeTao = ONE_TAO
    const run = await runWaitingOnStake(0.005)
    alphaPerTao = 40n

    const step = await nextLegStep({ run, index: 1, module: staking, chain: substrate() })
    if (step.signs !== "leg") throw new Error("expected a leg")

    const quotedForInput = (run.quote.outputAmountBN * step.input) / ONE_TAO
    expect(step.built.expectedOutput).toBeLessThan(quotedForInput)
    expect(step.built.acceptedOutput).toBe((quotedForInput * 995n) / 1000n)
  })

  it("refuses a stake the chain would reject as too small, before any fee is paid", async () => {
    freeTao = EXISTENTIAL_DEPOSIT + GAS_FEE + 1_000_000n

    await expect(stakeStep()).rejects.toThrow("Bittensor minimum is 0.002006018 TAO")
  })

  it("has nothing to stake until the TAO shows on the account", async () => {
    await expect(stakeStep()).rejects.toThrow("Nothing arrived from the previous leg")
  })
})
