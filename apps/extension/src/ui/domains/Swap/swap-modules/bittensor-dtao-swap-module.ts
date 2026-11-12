import { log } from "@common/log"
import { BITTENSOR_EVM_PAIRS } from "@core/domains/bittensor/constants"
import { taoToAlphaCeil } from "@talismn/balances"
import {
  evmNativeTokenId,
  type NetworkId,
  parseSubDTaoTokenId,
  parseTokenId,
  subNativeTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import type { ScaleApi } from "@talismn/sapi"
import { planckToTokens } from "@talismn/util"
import type { StakeDirection } from "@ui/domains/Staking/Bittensor/hooks/types"
import { FEE_ESTIMATE_HOTKEY, ROOT_NETUID } from "@ui/domains/Staking/Bittensor/utils/constants"
import { calculateEffectiveFeeRate } from "@ui/domains/Staking/Bittensor/utils/feeCalculations"
import { getDefaultValidatorHotkey } from "@ui/domains/Staking/Bittensor/utils/getDefaultValidatorHotkey"
import {
  type BittensorSwapSimulation,
  getAlphaPrice,
  getBittensorStakingPayload,
  getBittensorUnbondPayload,
  getDefaultMinStake,
  getSwapSimulation,
} from "@ui/domains/Staking/Bittensor/utils/helpers"
import {
  getMinimumStakeInput,
  getPoolInput,
  getStakingQuoteMath,
  getSubnetFeePercent,
} from "@ui/domains/Staking/Bittensor/utils/stakingQuote"
import BigNumber from "bignumber.js"
import z from "zod/v4"
import bittensorLogo from "./bittensor-logo.svg?url"
import type {
  BaseQuote,
  BittensorSwapConfig,
  BuildLegParams,
  BuiltLeg,
  EntryHop,
  QuoteFee,
  QuoteLeg,
  QuoteParams,
  SupportedSwapProtocol,
  SwapEnv,
  SwapModuleDefinition,
} from "./common.swap-module"
import { quoteFromLegs, TALISMAN_FEE_NAME } from "./helpers"

const PROTOCOL: SupportedSwapProtocol = "bittensor-dtao"
const PROVIDER_NAME = "Bittensor"
const DECENTRALISATION_SCORE = 3
const ESTIMATED_DURATION_SEC = 12
const TOKEN_DECIMALS = 9

const LegDataBaseSchema = z.object({
  networkId: z.string(),
  netuid: z.number().int().nonnegative(),
  /** rao per alpha at the pool's spot price, when quoted */
  alphaPrice: z.string(),
  /** rao per alpha this trade pays with no slippage, when quoted */
  swapPrice: z.string(),
  /** percent */
  priceImpact: z.number().nullable(),
})

const DTaoLegDataSchema = z.discriminatedUnion("direction", [
  LegDataBaseSchema.extend({
    direction: z.literal("stake"),
    /** null when the network has no default validator and the user picked none: the leg cannot be built */
    hotkey: z.string().nullable(),
    /** pinned: the target is a held position, its validator is the only one possible */
    validator: z.enum(["pickable", "pinned"]),
  }),
  LegDataBaseSchema.extend({
    direction: z.literal("unstake"),
    hotkey: z.string(),
  }),
])

/** What a dTAO leg carries from its quote to its build and to the confirm screen. JSON-safe: a swap run persists it */
export type DTaoLegData = z.infer<typeof DTaoLegDataSchema>

/** null for a leg of another module, or one whose data does not parse */
export const getDTaoLegData = (leg: QuoteLeg): DTaoLegData | null =>
  leg.protocol === PROTOCOL ? (DTaoLegDataSchema.safeParse(leg.data).data ?? null) : null

type Route = { networkId: NetworkId; netuid: number; taoTokenId: TokenId } & (
  | {
      direction: "stake"
      positionHotkey: string | undefined
    }
  | { direction: "unstake"; positionHotkey: string }
)

const STAKE_DIRECTION: Record<Route["direction"], StakeDirection> = {
  stake: "taoToAlpha",
  unstake: "alphaToTao",
}

const parseDTao = (tokenId: TokenId) => {
  try {
    return parseTokenId(tokenId).type === "substrate-dtao" ? parseSubDTaoTokenId(tokenId) : null
  } catch {
    return null
  }
}

const parseRoute = (fromTokenId: TokenId | null, toTokenId: TokenId | null): Route | null => {
  if (!fromTokenId || !toTokenId) return null
  const [from, to] = [parseDTao(fromTokenId), parseDTao(toTokenId)]
  const dtao = from ?? to
  if (!dtao || (from && to)) return null

  const taoTokenId = subNativeTokenId(dtao.networkId)
  const route = { networkId: dtao.networkId, netuid: dtao.netuid, taoTokenId }
  if (to) {
    return fromTokenId === taoTokenId
      ? { ...route, direction: "stake", positionHotkey: to.hotkey }
      : null
  }
  return toTokenId === taoTokenId && dtao.hotkey
    ? { ...route, direction: "unstake", positionHotkey: dtao.hotkey }
    : null
}

const getDTaoTokens = async (env: SwapEnv) =>
  Object.values(await env.getTokensMap("polkadot")).filter(
    (token) => token.type === "substrate-dtao"
  )

const getFromAssets = async (env: SwapEnv): Promise<TokenId[]> => {
  const dtaoTokens = await getDTaoTokens(env)
  const networkIds = new Set(dtaoTokens.map((token) => token.networkId))
  return [
    ...[...networkIds].map((networkId) => subNativeTokenId(networkId)),
    ...dtaoTokens.filter((token) => token.hotkey).map((token) => token.id),
  ]
}

const getToAssets = async (fromTokenId: TokenId | null, env: SwapEnv): Promise<TokenId[]> => {
  const dtaoTokens = await getDTaoTokens(env)
  if (!fromTokenId)
    return [
      ...new Set(dtaoTokens.map((token) => subNativeTokenId(token.networkId))),
      ...dtaoTokens.map((token) => token.id),
    ]

  const position = parseDTao(fromTokenId)
  if (position) return position.hotkey ? [subNativeTokenId(position.networkId)] : []

  return dtaoTokens
    .filter((token) => subNativeTokenId(token.networkId) === fromTokenId)
    .map((token) => token.id)
}

type FeeTerms = { feePercent: number; seekDiscount: number }

const getFeeTerms = (route: Route, { remote, seekDiscount }: BittensorSwapConfig): FeeTerms => ({
  feePercent:
    route.netuid === ROOT_NETUID
      ? 0
      : getSubnetFeePercent(remote.fee, route.netuid, STAKE_DIRECTION[route.direction]),
  seekDiscount,
})

const simulate = async (
  sapi: ScaleApi,
  route: Route,
  amount: bigint
): Promise<BittensorSwapSimulation> =>
  route.netuid === ROOT_NETUID
    ? { tao_amount: amount, alpha_amount: amount, tao_fee: 0n, alpha_fee: 0n }
    : getSwapSimulation(sapi, route.netuid, STAKE_DIRECTION[route.direction], amount)

const getMinimumInput = async (
  sapi: ScaleApi,
  route: Route,
  terms: FeeTerms,
  alphaPrice: bigint
): Promise<bigint> => {
  const minTaoStake = getDefaultMinStake(sapi)
  if (route.direction === "unstake") return taoToAlphaCeil(minTaoStake, alphaPrice)

  return (
    getMinimumStakeInput({
      netuid: route.netuid,
      baseMinimum: minTaoStake,
      minStakeSimulation: await simulate(sapi, route, minTaoStake),
      effectiveFeeRate: calculateEffectiveFeeRate(
        route.netuid,
        terms.feePercent,
        terms.seekDiscount
      ),
    }) ?? minTaoStake
  )
}

const assertMinimumInput = async (
  env: SwapEnv,
  sapi: ScaleApi,
  route: Route,
  terms: FeeTerms,
  alphaPrice: bigint,
  fromTokenId: TokenId,
  amount: bigint
) => {
  const minimum = await getMinimumInput(sapi, route, terms, alphaPrice)
  if (amount >= minimum) return
  const symbol = (await env.getToken(fromTokenId))?.symbol ?? ""
  throw new Error(
    `${PROVIDER_NAME} minimum is ${planckToTokens(minimum.toString(), TOKEN_DECIMALS)} ${symbol}`
  )
}

const taoFee = (route: Route, planck: bigint, kind: Pick<QuoteFee, "name" | "gas">): QuoteFee => ({
  ...kind,
  tokenId: route.taoTokenId,
  amount: BigNumber(planckToTokens(planck.toString(), TOKEN_DECIMALS)),
})

const talismanQuoteFees = (route: Route, planck: bigint): QuoteFee[] =>
  planck > 0n ? [taoFee(route, planck, { name: TALISMAN_FEE_NAME })] : []

type CallParams = {
  sapi: ScaleApi
  route: Route
  address: string
  hotkey: string
  input: bigint
  terms: FeeTerms
  priceLimit: bigint
  talismanFee: bigint
}

const buildCall = ({
  sapi,
  route,
  address,
  hotkey,
  input,
  terms,
  priceLimit,
  talismanFee,
}: CallParams) => {
  const call = { sapi, address, hotkey, priceLimit, talismanFee, netuid: route.netuid }
  return route.direction === "stake"
    ? getBittensorStakingPayload({
        ...call,
        amount: getPoolInput({
          ...terms,
          direction: "taoToAlpha",
          netuid: route.netuid,
          amountIn: input,
        }),
        remarkType: "swap",
      })
    : getBittensorUnbondPayload({ ...call, amount: input, remarkType: "swap" })
}

const estimateGasFee = async (params: CallParams): Promise<QuoteFee | null> => {
  try {
    const { payload } = await buildCall(params)
    const planck = await params.sapi.getFeeEstimate(payload)
    return taoFee(params.route, planck, { name: "Est. Gas Fees", gas: true })
  } catch (err) {
    log.error(new Error("Failed to estimate Bittensor staking fee", { cause: err }))
    return null
  }
}

type Validator =
  | Pick<Extract<DTaoLegData, { direction: "stake" }>, "direction" | "hotkey" | "validator">
  | Pick<Extract<DTaoLegData, { direction: "unstake" }>, "direction" | "hotkey">

const getValidator = async (
  route: Route,
  { stakeHotkey, fromAddress }: QuoteParams,
  { remote }: BittensorSwapConfig,
  env: SwapEnv
): Promise<Validator> => {
  if (route.direction === "unstake") return { direction: "unstake", hotkey: route.positionHotkey }
  if (route.positionHotkey)
    return { direction: "stake", hotkey: route.positionHotkey, validator: "pinned" }

  const hotkey =
    stakeHotkey ??
    getDefaultValidatorHotkey(
      route.networkId,
      route.netuid,
      { bittensor: remote },
      await env.getBalances(),
      fromAddress,
      "featured"
    )
  return { direction: "stake", hotkey: hotkey ?? null, validator: "pickable" }
}

const getQuote = async (params: QuoteParams, env: SwapEnv): Promise<BaseQuote | null> => {
  const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params

  const route = parseRoute(fromTokenId, toTokenId)
  if (!route || !fromTokenId || !toTokenId || !fromAmount || fromAmount <= 0n) return null
  if (fromAddress && toAddress && !isAddressEqual(fromAddress, toAddress)) {
    if (params.input === "upTo") return null
    throw new Error(
      `${PROVIDER_NAME} stakes and unstakes on the sending account. Choose it as the recipient.`
    )
  }

  const [sapi, config] = await Promise.all([
    env.substrateApi(route.networkId),
    env.getBittensorConfig(),
  ])
  const terms = getFeeTerms(route, config)
  const direction = STAKE_DIRECTION[route.direction]

  const alphaPrice = await getAlphaPrice(sapi, route.netuid)
  await assertMinimumInput(env, sapi, route, terms, alphaPrice, fromTokenId, fromAmount)

  const [simulation, validator] = await Promise.all([
    simulate(
      sapi,
      route,
      getPoolInput({ ...terms, direction, netuid: route.netuid, amountIn: fromAmount })
    ),
    getValidator(route, params, config, env),
  ])
  const math = getStakingQuoteMath({
    ...terms,
    direction,
    amountIn: fromAmount,
    simulation,
    alphaPrice,
    slippage: 0,
  })

  const gasFee = fromAddress
    ? await estimateGasFee({
        sapi,
        route,
        address: fromAddress,
        hotkey: validator.hotkey ?? FEE_ESTIMATE_HOTKEY,
        input: fromAmount,
        terms,
        priceLimit: math.priceLimit,
        talismanFee: math.talismanFee,
      })
    : null

  const data: DTaoLegData = {
    ...validator,
    networkId: route.networkId,
    netuid: route.netuid,
    alphaPrice: alphaPrice.toString(),
    swapPrice: math.swapPrice.toString(),
    priceImpact: math.priceImpact,
  }

  return quoteFromLegs(
    [
      {
        protocol: PROTOCOL,
        fromTokenId,
        toTokenId,
        signer: fromAddress,
        recipient: toAddress,
        inputAmount: fromAmount,
        outputAmount: math.amountOut,
        fees: [...talismanQuoteFees(route, math.talismanFee), ...(gasFee ? [gasFee] : [])],
        timeInSec: ESTIMATED_DURATION_SEC,
        data,
      },
    ],
    {
      protocol: PROTOCOL,
      decentralisationScore: DECENTRALISATION_SCORE,
      providerLogo: bittensorLogo,
      providerName: PROVIDER_NAME,
      talismanFee: calculateEffectiveFeeRate(route.netuid, terms.feePercent, terms.seekDiscount),
    }
  )
}

const scaleDown = (amount: bigint, slippage: number) =>
  (amount * BigInt(Math.round((1 - slippage) * 10_000))) / 10_000n

const buildLeg = async (
  { leg, input, context, slippage }: BuildLegParams,
  env: SwapEnv
): Promise<BuiltLeg> => {
  const route = parseRoute(leg.fromTokenId, leg.toTokenId)
  const data = getDTaoLegData(leg)
  if (!route || !data || data.direction !== route.direction || !leg.signer)
    throw new Error("Please select the quote again")
  if (context.platform !== "polkadot") throw new Error("Missing substrate context")
  if (!data.hotkey) throw new Error("Select a validator")

  const { sapi } = context
  const terms = getFeeTerms(route, await env.getBittensorConfig())
  const direction = STAKE_DIRECTION[route.direction]

  // a later leg can hold less than the quote checked: the chain would take its fee and refuse the stake
  if (input < leg.inputAmount)
    await assertMinimumInput(
      env,
      sapi,
      route,
      terms,
      await getAlphaPrice(sapi, route.netuid),
      leg.fromTokenId,
      input
    )

  const simulation = await simulate(
    sapi,
    route,
    getPoolInput({ ...terms, direction, netuid: route.netuid, amountIn: input })
  )
  const math = getStakingQuoteMath({
    ...terms,
    direction,
    amountIn: input,
    simulation,
    alphaPrice: null,
    slippage,
  })

  const { payload, txMetadata } = await buildCall({
    sapi,
    route,
    address: leg.signer,
    hotkey: data.hotkey,
    input,
    terms,
    priceLimit: math.priceLimit,
    talismanFee: math.talismanFee,
  })

  const floor = scaleDown((leg.outputAmount * input) / leg.inputAmount, slippage)

  return {
    transaction: { platform: "polkadot", payload, txMetadata },
    fees: [
      ...talismanQuoteFees(route, math.talismanFee),
      ...leg.fees.filter((fee) => fee.name !== TALISMAN_FEE_NAME),
    ],
    expectedOutput: math.amountOut,
    ...(math.amountOut < floor && { acceptedOutput: floor }),
    txInfo: {
      type: "bittensor-staking",
      fromTokenId: leg.fromTokenId,
      toTokenId: leg.toTokenId,
      fromAmount: input.toString(),
      toAmount: math.amountOut.toString(),
      hotkey: data.hotkey,
    },
  }
}

export const bittensorDTaoSwapModule: SwapModuleDefinition = {
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  supportsSlippageSetting: true,
  getFromAssets,
  getToAssets,
  getQuote,
  buildLeg,
  entryHops: BITTENSOR_EVM_PAIRS.map(
    (pair): EntryHop => ({
      from: evmNativeTokenId(pair.evmNetworkId),
      hub: subNativeTokenId(pair.substrateNetworkId),
      via: "bittensor-evm",
      flag: "SWAPS_MULTI_HOP",
    })
  ),
}
