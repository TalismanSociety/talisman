import { log } from "@common/log"
import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { BITTENSOR_SS58_PREFIX, BITTENSOR_WEI_PER_RAO } from "@core/domains/bittensor/constants"
import {
  abiCcipTokenPool,
  abiForevermoneyAlphaGateway,
  abiForevermoneyAlphaVault,
  abiForevermoneySpokeGateway,
} from "@core/domains/forevermoney/abi"
import {
  FOREVERMONEY_ALPHA_TOKEN,
  FOREVERMONEY_ALPHA_VAULT,
  FOREVERMONEY_BITTENSOR_EVM_NETWORK_ID,
  FOREVERMONEY_BITTENSOR_SELECTOR,
  FOREVERMONEY_BITTENSOR_TOKEN_POOL,
  FOREVERMONEY_ROUTES,
  FOREVERMONEY_SPOKE_TOKEN_POOL,
  FOREVERMONEY_WTAO,
  type ForevermoneyRoute,
  findForevermoneyRoute,
} from "@core/domains/forevermoney/constants"
import type { SwapEnv } from "@core/domains/swaps/env"
import { getEvmNetwork, quoteFromLegs, TALISMAN_FEE_NAME } from "@core/domains/swaps/helpers"
import type {
  ApprovalInfo,
  ApprovalParams,
  BackgroundSwapModule,
  BaseQuote,
  BoundLegParams,
  BuildLegParams,
  BuiltLeg,
  LegBound,
  LegBoundCall,
  LegObservation,
  NonEmpty,
  ObserveLegParams,
  QuoteFee,
  QuoteLeg,
  QuoteParams,
  SupportedSwapProtocol,
} from "@core/domains/swaps/types"
import { evmNativeTokenId, type TokenId } from "@talismn/chaindata-provider"
import {
  frontierH160ToSs58Mirror,
  frontierSs58ToPublicKeyHex,
  isAddressEqual,
  isEthereumAddress,
} from "@talismn/crypto"
import { planckToTokens } from "@talismn/util"
import BigNumber from "bignumber.js"
import {
  decodeFunctionData,
  encodeFunctionData,
  type Hex,
  type PublicClient,
  zeroAddress,
} from "viem"
import { prepareTransactionRequestWithGasCheck } from "../evm-gas-check"
import { observeEvmLeg } from "../observeEvm"
import { assertNativeValueWithinInput } from "../provider-transaction-guards"
import forevermoneyLogo from "./forevermoney-logo.svg?url"

const PROTOCOL: SupportedSwapProtocol = "forevermoney"
const PROTOCOL_NAME = "ForeverMoney"
const DECENTRALISATION_SCORE = 2
const OUTBOUND_DURATION_SEC = 180
const INBOUND_DURATION_SEC = 1800
const EVM_DECIMALS = 18
const NOTICE =
  "Experimental bridge operated by ForeverMoney over Chainlink CCIP. Bridged TAO is backed by root-staked TAO."

// CCIP fee is a fraction of a cent to a dollar; anything above these caps means a broken quote
const MAX_CCIP_FEE_WEI_SPOKE = 10n ** 16n // 0.01 ETH
const MAX_CCIP_FEE_WEI_BITTENSOR = 10n ** 17n // 0.1 TAO
// contracts refund the unused part of the fee, the SDK sends the same 2% buffer
const FEE_BUFFER_NUMERATOR = 102n
const FEE_BUFFER_DENOMINATOR = 100n
const MIN_LIQUID_INBOUND_WEI = 10n ** 16n // 0.01 TAO, the vault must unstake the bridged position
const MIN_OUTBOUND_WEI = 2n * 10n ** 15n // 0.002 TAO, the vault stakes the deposit and subtensor rejects smaller stakes
// the spoke default of 300k no longer covers the liquid exit on Bittensor, the SDK sends the same budget
const INBOUND_DESTINATION_GAS_LIMIT = 3_500_000n
const BPS_DENOMINATOR = 10_000n
const MAX_PARTNER_FEE_BPS = 100
// measured on Finney: 615k for bridgeOut, 743k for bridgeOutWithFee
const BRIDGE_OUT_GAS_CEILING = 700_000n
const BRIDGE_OUT_WITH_FEE_GAS_CEILING = 850_000n
// the fee cap of a background-signed leg leaves room for the gas price to move after the approval
const MAX_NETWORK_FEE_HEADROOM = 3n
// a later leg's output floor: the user's slippage, but never under 1%, as the CCIP fee drifts
const MIN_FLOOR_BPS = 100
/** the source receipt must exist within this, the CCIP delivery is tracked by the swap status */
const LEG_DEADLINE_MS = 30 * 60_000

type PartnerFee = { recipient: `0x${string}`; bps: number }

/** a later leg: the signer holds at most the leg's input once the previous leg lands, fees and gas fit inside it */
type UpToLegData = { input: "upTo" }

const isUpToLeg = (leg: QuoteLeg) =>
  (leg.data as Partial<UpToLegData> | undefined)?.input === "upTo"

const gasCeiling = (partnerFee: PartnerFee | null) =>
  partnerFee ? BRIDGE_OUT_WITH_FEE_GAS_CEILING : BRIDGE_OUT_GAS_CEILING

/** The gateways charge the partner fee on top of the bridged amount, so both are carved out of the input */
type BridgeAmounts = {
  amountWei: bigint
  partnerFee: PartnerFee | null
  partnerFeeWei: bigint
}

// --- helpers ---

const toWholeRao = (wei: bigint) => (wei / BITTENSOR_WEI_PER_RAO) * BITTENSOR_WEI_PER_RAO

const toWholeRaoRoundedUp = (wei: bigint) => toWholeRao(wei + BITTENSOR_WEI_PER_RAO - 1n)

const getPartnerFee = async (route: ForevermoneyRoute): Promise<PartnerFee | null> => {
  const config = (await remoteConfigStore.get("swaps"))?.forevermoney
  const recipient = config?.feeRecipients?.[route.sourceNetworkId]
  const bps = config?.feeBps ?? 0
  if (!recipient || !isEthereumAddress(recipient) || isAddressEqual(recipient, zeroAddress))
    return null
  if (!Number.isInteger(bps) || bps <= 0 || bps > MAX_PARTNER_FEE_BPS) return null
  return { recipient, bps }
}

/** The hub gateway rounds the native top-up up to a whole rao */
const getPartnerFeeWei = (route: ForevermoneyRoute, amountWei: bigint, bps: number) => {
  const cut = (amountWei * BigInt(bps)) / BPS_DENOMINATOR
  return route.direction === "evm-to-spoke" ? toWholeRaoRoundedUp(cut) : cut
}

const getBridgeAmounts = async (
  route: ForevermoneyRoute,
  fromAmount: bigint
): Promise<BridgeAmounts> => {
  const withoutFee = { amountWei: toWholeRao(fromAmount), partnerFee: null, partnerFeeWei: 0n }
  const partnerFee = await getPartnerFee(route)
  if (!partnerFee) return withoutFee

  let amountWei = toWholeRao(
    (fromAmount * BPS_DENOMINATOR) / (BPS_DENOMINATOR + BigInt(partnerFee.bps))
  )
  while (
    amountWei > 0n &&
    amountWei + getPartnerFeeWei(route, amountWei, partnerFee.bps) > fromAmount
  )
    amountWei -= BITTENSOR_WEI_PER_RAO
  const partnerFeeWei = getPartnerFeeWei(route, amountWei, partnerFee.bps)

  // the hub stakes the native top-up, subtensor rejects it below the minimum stake
  if (route.direction === "evm-to-spoke" && partnerFeeWei < MIN_OUTBOUND_WEI) return withoutFee

  return { amountWei, partnerFee, partnerFeeWei }
}

const withFeeBuffer = (fee: bigint) => (fee * FEE_BUFFER_NUMERATOR) / FEE_BUFFER_DENOMINATOR

const isSubstrateAddress = (address: string) => {
  if (isEthereumAddress(address)) return false
  try {
    frontierSs58ToPublicKeyHex(address)
    return true
  } catch {
    return false
  }
}

const getDestinationPubkey = (route: ForevermoneyRoute, toAddress: string): `0x${string}` => {
  if (route.direction === "spoke-to-evm") {
    if (!isEthereumAddress(toAddress)) throw new Error("Invalid recipient")
    return frontierSs58ToPublicKeyHex(frontierH160ToSs58Mirror(toAddress, BITTENSOR_SS58_PREFIX))
  }
  if (!isSubstrateAddress(toAddress)) throw new Error("Invalid recipient")
  return frontierSs58ToPublicKeyHex(toAddress)
}

const getQuoteDestinationPubkey = (
  route: ForevermoneyRoute,
  fromAddress: `0x${string}`,
  toAddress: string | null
) =>
  toAddress !== null
    ? getDestinationPubkey(route, toAddress)
    : frontierSs58ToPublicKeyHex(frontierH160ToSs58Mirror(fromAddress, BITTENSOR_SS58_PREFIX))

const getBridgeToFinneyArgs = (
  { amountWei }: BridgeAmounts,
  destinationPubkey: `0x${string}`,
  evmFallback: `0x${string}`
) =>
  [
    FOREVERMONEY_WTAO,
    amountWei,
    { ss58: destinationPubkey, evmFallback, wantLiquid: true, minTaoOut: amountWei },
    INBOUND_DESTINATION_GAS_LIMIT,
  ] as const

const encodeBridgeToFinney = (
  amounts: BridgeAmounts,
  destinationPubkey: `0x${string}`,
  evmFallback: `0x${string}`
) => {
  const args = getBridgeToFinneyArgs(amounts, destinationPubkey, evmFallback)
  return amounts.partnerFee
    ? encodeFunctionData({
        abi: abiForevermoneySpokeGateway,
        functionName: "bridgeToFinneyWithFee",
        args: [...args, amounts.partnerFee],
      })
    : encodeFunctionData({ abi: abiForevermoneySpokeGateway, functionName: "bridgeToFinney", args })
}

const encodeBridgeOut = (
  route: ForevermoneyRoute,
  recipient: `0x${string}`,
  { amountWei, partnerFee }: BridgeAmounts
) => {
  const args = [
    route.spoke.selector,
    FOREVERMONEY_ALPHA_TOKEN,
    recipient,
    amountWei,
    0n,
    amountWei,
  ] as const
  return partnerFee
    ? encodeFunctionData({
        abi: abiForevermoneyAlphaGateway,
        functionName: "bridgeOutWithFee",
        args: [...args, partnerFee],
      })
    : encodeFunctionData({ abi: abiForevermoneyAlphaGateway, functionName: "bridgeOut", args })
}

const getTransactionValue = (route: ForevermoneyRoute, amounts: BridgeAmounts, feeWei: bigint) =>
  route.direction === "evm-to-spoke"
    ? amounts.amountWei + amounts.partnerFeeWei + withFeeBuffer(feeWei)
    : withFeeBuffer(feeWei)

// --- on-chain reads ---

const readOutboundCcipFeeWei = async (
  client: PublicClient,
  route: ForevermoneyRoute,
  { amountWei, partnerFee, partnerFeeWei }: BridgeAmounts,
  recipient: `0x${string}`
) => {
  if (!partnerFee)
    return client.readContract({
      abi: abiForevermoneyAlphaGateway,
      address: route.sourceGateway,
      functionName: "quoteBridgeOut",
      args: [route.spoke.selector, FOREVERMONEY_ALPHA_TOKEN, recipient, amountWei],
    })

  const [fee, nativeTopUp, , amountCrossing] = await client.readContract({
    abi: abiForevermoneyAlphaGateway,
    address: route.sourceGateway,
    functionName: "quoteBridgeOutWithFee",
    args: [
      route.spoke.selector,
      FOREVERMONEY_ALPHA_TOKEN,
      recipient,
      amountWei,
      amountWei,
      0n,
      partnerFee,
    ],
  })
  if (nativeTopUp !== partnerFeeWei || amountCrossing !== amountWei)
    throw new Error("Unexpected ForeverMoney fee quote")
  return fee
}

const readInboundCcipFeeWei = async (
  client: PublicClient,
  route: ForevermoneyRoute,
  amounts: BridgeAmounts,
  destinationPubkey: `0x${string}`,
  evmFallback: `0x${string}`
) => {
  const args = getBridgeToFinneyArgs(amounts, destinationPubkey, evmFallback)
  if (!amounts.partnerFee)
    return client.readContract({
      abi: abiForevermoneySpokeGateway,
      address: route.sourceGateway,
      functionName: "quoteBridgeToFinney",
      args,
    })

  const [fee, cut, amountCrossing] = await client.readContract({
    abi: abiForevermoneySpokeGateway,
    address: route.sourceGateway,
    functionName: "quoteBridgeToFinneyWithFee",
    args: [...args, amounts.partnerFee],
  })
  if (cut !== amounts.partnerFeeWei || amountCrossing !== amounts.amountWei)
    throw new Error("Unexpected ForeverMoney fee quote")
  return fee
}

const readCcipFeeWei = async (
  client: PublicClient,
  route: ForevermoneyRoute,
  amounts: BridgeAmounts,
  fromAddress: `0x${string}`,
  toAddress: string | null
): Promise<bigint> => {
  if (route.direction === "evm-to-spoke") {
    const recipient = toAddress && isEthereumAddress(toAddress) ? toAddress : fromAddress
    const fee = await readOutboundCcipFeeWei(client, route, amounts, recipient)
    if (fee > MAX_CCIP_FEE_WEI_BITTENSOR) throw new Error("Bridge fee is unexpectedly high")
    return fee
  }

  const destinationPubkey = getQuoteDestinationPubkey(route, fromAddress, toAddress)
  const fee = await readInboundCcipFeeWei(client, route, amounts, destinationPubkey, fromAddress)
  if (fee > MAX_CCIP_FEE_WEI_SPOKE) throw new Error("Bridge fee is unexpectedly high")
  return fee
}

const assertWithinRateLimit = async (
  client: PublicClient,
  route: ForevermoneyRoute,
  amountWei: bigint
) => {
  const isOutbound = route.direction === "evm-to-spoke"
  const bucket = await client.readContract({
    abi: abiCcipTokenPool,
    address: isOutbound ? FOREVERMONEY_BITTENSOR_TOKEN_POOL : FOREVERMONEY_SPOKE_TOKEN_POOL,
    functionName: "getCurrentOutboundRateLimiterState",
    args: [isOutbound ? route.spoke.selector : FOREVERMONEY_BITTENSOR_SELECTOR],
  })
  if (bucket.isEnabled && amountWei > bucket.tokens)
    throw new Error(
      `Bridge rate limit reached, at most ${planckToTokens(bucket.tokens.toString(), EVM_DECIMALS)} TAO can be bridged right now`
    )
}

const assertVaultOpen = async (env: SwapEnv, route: ForevermoneyRoute) => {
  const client = await env.evmClient(FOREVERMONEY_BITTENSOR_EVM_NETWORK_ID)
  const [isPaused, migrationTarget, laneAllowed] = await Promise.all([
    client.readContract({
      abi: abiForevermoneyAlphaVault,
      address: FOREVERMONEY_ALPHA_VAULT,
      functionName: "isPaused",
    }),
    client.readContract({
      abi: abiForevermoneyAlphaVault,
      address: FOREVERMONEY_ALPHA_VAULT,
      functionName: "migrationTarget",
    }),
    client.readContract({
      abi: abiForevermoneyAlphaGateway,
      address: route.hubGateway,
      functionName: "allowedLane",
      args: [route.spoke.selector],
    }),
  ])
  if (isPaused) throw new Error("ForeverMoney bridge is paused")
  if (!isAddressEqual(migrationTarget, zeroAddress))
    throw new Error("ForeverMoney vault is migrating")
  if (!laneAllowed) throw new Error(`ForeverMoney lane to ${route.spoke.name} is closed`)
}

const assertMinimum = (route: ForevermoneyRoute, { amountWei, partnerFee }: BridgeAmounts) => {
  const minAmountWei =
    route.direction === "evm-to-spoke" ? MIN_OUTBOUND_WEI : MIN_LIQUID_INBOUND_WEI
  if (amountWei >= minAmountWei) return
  const minInputWei = partnerFee
    ? minAmountWei + getPartnerFeeWei(route, minAmountWei, partnerFee.bps)
    : minAmountWei
  throw new Error(
    `${PROTOCOL_NAME} minimum is ${planckToTokens(minInputWei.toString(), EVM_DECIMALS)} TAO`
  )
}

const runChecks = async (
  env: SwapEnv,
  sourceClient: PublicClient,
  route: ForevermoneyRoute,
  amounts: BridgeAmounts
) => {
  assertMinimum(route, amounts)
  await Promise.all([
    assertWithinRateLimit(sourceClient, route, amounts.amountWei),
    assertVaultOpen(env, route),
  ])
}

type UpToFit = { amounts: BridgeAmounts; feeWei: bigint; gasReserveWei: bigint }

/**
 * Fits the bridged amount, the partner fee, the buffered CCIP fee and a gas reserve inside
 * `available`. The fee view takes an amount and the amount depends on the fee, so the fee is read
 * at the full amount, the amounts are fitted, and the fee is read once more at the fitted amount.
 * Never estimates gas: the sender may hold nothing yet.
 */
const fitUpTo = async (
  client: PublicClient,
  route: ForevermoneyRoute,
  available: bigint,
  fromAddress: `0x${string}`,
  toAddress: string | null,
  feePerGasWei: bigint
): Promise<UpToFit> => {
  const partnerFee = await getPartnerFee(route)
  const gasReserveWei = gasCeiling(partnerFee) * feePerGasWei
  const fit = (feeWei: bigint) =>
    getBridgeAmounts(route, available - withFeeBuffer(feeWei) - gasReserveWei)

  const fullFee = await readCcipFeeWei(
    client,
    route,
    await getBridgeAmounts(route, available),
    fromAddress,
    toAddress
  )
  let amounts = await fit(fullFee)
  assertMinimum(route, amounts)
  const feeWei = await readCcipFeeWei(client, route, amounts, fromAddress, toAddress)
  if (feeWei > fullFee) amounts = await fit(feeWei)

  return { amounts, feeWei, gasReserveWei }
}

const estimateGasFeeWei = async (
  client: PublicClient,
  request: { account: `0x${string}`; to: `0x${string}`; data: `0x${string}`; value: bigint }
): Promise<bigint | null> => {
  try {
    const [gasPrice, gasLimit] = await Promise.all([
      client.getGasPrice(),
      client.estimateGas(request),
    ])
    return gasPrice * gasLimit
  } catch (err) {
    // an inbound estimate fails until the ERC20 allowance exists
    log.debug("Failed to estimate ForeverMoney bridge gas", { err })
    return null
  }
}

// --- quote ---

const toQuoteFee = (name: string, tokenId: TokenId, wei: bigint): QuoteFee => ({
  name,
  tokenId,
  amount: BigNumber(planckToTokens(wei.toString(), EVM_DECIMALS)),
})

const toBridgeFee = (tokenId: TokenId, feeWei: bigint): QuoteFee => ({
  ...toQuoteFee("Chainlink CCIP Fee", tokenId, withFeeBuffer(feeWei)),
  additional: true,
})

const toTalismanFees = (route: ForevermoneyRoute, { partnerFeeWei }: BridgeAmounts) =>
  partnerFeeWei > 0n ? [toQuoteFee(TALISMAN_FEE_NAME, route.fromTokenId, partnerFeeWei)] : []

const getOutputAmount = (route: ForevermoneyRoute, amountWei: bigint) =>
  route.direction === "spoke-to-substrate" ? amountWei / BITTENSOR_WEI_PER_RAO : amountWei

const presentation = (
  route: ForevermoneyRoute,
  amounts: BridgeAmounts,
  maxNativeTokenGasBuffer: string | undefined
) => ({
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  talismanFee: amounts.partnerFee ? amounts.partnerFee.bps / Number(BPS_DENOMINATOR) : undefined,
  providerLogo: forevermoneyLogo,
  providerName: PROTOCOL_NAME,
  notice: NOTICE,
  maxNativeTokenGasBuffer: route.direction === "evm-to-spoke" ? maxNativeTokenGasBuffer : undefined,
})

/** quotes a later leg of a plan: the sender holds nothing yet, every cost fits inside the input */
const getUpToQuote = async (
  route: ForevermoneyRoute,
  { fromAmount, fromAddress, toAddress }: QuoteParams & { fromAmount: bigint },
  env: SwapEnv
): Promise<BaseQuote | null> => {
  if (route.direction !== "evm-to-spoke" || !fromAddress || !isEthereumAddress(fromAddress))
    return null

  const client = await env.evmClient(route.sourceNetworkId)
  const gasPrice = await client.getGasPrice()
  const { amounts, feeWei, gasReserveWei } = await fitUpTo(
    client,
    route,
    fromAmount,
    fromAddress,
    toAddress,
    gasPrice
  )
  await runChecks(env, client, route, amounts)

  const feeTokenId = evmNativeTokenId(route.sourceNetworkId)
  const data: UpToLegData = { input: "upTo" }
  return quoteFromLegs(
    [
      {
        protocol: PROTOCOL,
        fromTokenId: route.fromTokenId,
        toTokenId: route.toTokenId,
        signer: fromAddress,
        recipient: toAddress,
        inputAmount: fromAmount,
        outputAmount: amounts.amountWei,
        fees: [
          ...toTalismanFees(route, amounts),
          toQuoteFee("Chainlink CCIP Fee", feeTokenId, withFeeBuffer(feeWei)),
          toQuoteFee("Est. Gas Fees", feeTokenId, gasReserveWei),
        ],
        timeInSec: OUTBOUND_DURATION_SEC,
        data,
      },
    ],
    presentation(route, amounts, undefined)
  )
}

const getQuote = async (params: QuoteParams, env: SwapEnv): Promise<BaseQuote | null> => {
  const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params

  const route = findForevermoneyRoute(fromTokenId, toTokenId)
  if (!route || !fromAmount || fromAmount <= 0n) return null
  if (params.input === "upTo") return getUpToQuote(route, { ...params, fromAmount }, env)

  const isOutbound = route.direction === "evm-to-spoke"
  const [amounts, client] = await Promise.all([
    getBridgeAmounts(route, fromAmount),
    env.evmClient(route.sourceNetworkId),
  ])

  await runChecks(env, client, route, amounts)

  const feeTokenId = evmNativeTokenId(route.sourceNetworkId)
  const fees: QuoteFee[] = toTalismanFees(route, amounts)
  let feeWei: bigint | null = null

  if (fromAddress && isEthereumAddress(fromAddress)) {
    feeWei = await readCcipFeeWei(client, route, amounts, fromAddress, toAddress)
    fees.push(toBridgeFee(feeTokenId, feeWei))

    const recipient = toAddress && isEthereumAddress(toAddress) ? toAddress : fromAddress
    const gasFeeWei = await estimateGasFeeWei(client, {
      account: fromAddress,
      to: route.sourceGateway,
      data: isOutbound
        ? encodeBridgeOut(route, recipient, amounts)
        : encodeBridgeToFinney(
            amounts,
            getQuoteDestinationPubkey(route, fromAddress, toAddress),
            fromAddress
          ),
      value: getTransactionValue(route, amounts, feeWei),
    })
    if (gasFeeWei !== null) fees.push(toQuoteFee("Est. Gas Fees", feeTokenId, gasFeeWei))
  }

  return quoteFromLegs(
    [
      {
        protocol: PROTOCOL,
        fromTokenId: route.fromTokenId,
        toTokenId: route.toTokenId,
        signer: fromAddress,
        recipient: toAddress,
        inputAmount: fromAmount,
        outputAmount: getOutputAmount(route, amounts.amountWei),
        fees,
        timeInSec: isOutbound ? OUTBOUND_DURATION_SEC : INBOUND_DURATION_SEC,
      },
    ],
    presentation(route, amounts, feeWei !== null ? withFeeBuffer(feeWei).toString() : undefined)
  )
}

// --- leg (re-quoted on the confirmation screen) ---

/** Fresh fee, fresh checks and the destination block the delivery watcher starts from */
const buildLeg = async (
  { leg, input, context }: BuildLegParams,
  env: SwapEnv
): Promise<BuiltLeg> => {
  const route = findForevermoneyRoute(leg.fromTokenId, leg.toTokenId)
  if (!route) throw new Error("Please select the quote again")
  const { signer: fromAddress, recipient: toAddress } = leg
  if (!fromAddress || !isEthereumAddress(fromAddress)) throw new Error("Invalid sender address")
  if (!toAddress) throw new Error("Missing recipient")
  if (
    route.direction === "spoke-to-substrate"
      ? !isSubstrateAddress(toAddress)
      : !isEthereumAddress(toAddress)
  )
    throw new Error("Invalid recipient")
  if (context.platform !== "ethereum") throw new Error("Missing EVM context")

  const [sourceNetwork, sourceClient, destinationClient] = await Promise.all([
    getEvmNetwork(env, route.sourceNetworkId),
    env.evmClient(route.sourceNetworkId),
    env.evmClient(route.destinationNetworkId),
  ])

  const upTo = isUpToLeg(leg)
  const feesPerGas = upTo ? await sourceClient.estimateFeesPerGas() : null
  const fit = feesPerGas
    ? await fitUpTo(sourceClient, route, input, fromAddress, toAddress, feesPerGas.maxFeePerGas)
    : { amounts: await getBridgeAmounts(route, input), feeWei: null }
  const { amounts } = fit

  await runChecks(env, sourceClient, route, amounts)

  const [feeWei, destinationStartBlock] = await Promise.all([
    fit.feeWei ?? readCcipFeeWei(sourceClient, route, amounts, fromAddress, toAddress),
    destinationClient.getBlockNumber(),
  ])

  // the confirm screen shows the quoted output, the bridge must not deliver less. A later leg of
  // a plan spends what landed instead, and admission holds its output to the approved floor
  const expectedOutput = getOutputAmount(route, amounts.amountWei)
  if (!upTo && expectedOutput < leg.outputAmount) throw new Error("Please select the quote again")

  const isOutbound = route.direction === "evm-to-spoke"
  if (isOutbound)
    assertNativeValueWithinInput({
      value: upTo
        ? getTransactionValue(route, amounts, feeWei)
        : amounts.amountWei + amounts.partnerFeeWei,
      fromAmount: input,
      isNativeInput: true,
    })

  const transaction = await prepareTransactionRequestWithGasCheck(
    sourceClient,
    sourceNetwork.nativeTokenId,
    {
      chain: null,
      account: fromAddress,
      to: route.sourceGateway,
      data: isOutbound
        ? encodeBridgeOut(route, toAddress as `0x${string}`, amounts)
        : encodeBridgeToFinney(amounts, getDestinationPubkey(route, toAddress), fromAddress),
      value: getTransactionValue(route, amounts, feeWei),
      ...(feesPerGas && {
        gas: gasCeiling(amounts.partnerFee),
        maxFeePerGas: feesPerGas.maxFeePerGas,
        maxPriorityFeePerGas: feesPerGas.maxPriorityFeePerGas,
      }),
    }
  )

  const feeTokenId = evmNativeTokenId(route.sourceNetworkId)
  return {
    transaction: { platform: "ethereum", transaction },
    fees: [
      ...toTalismanFees(route, amounts),
      upTo
        ? toQuoteFee("Chainlink CCIP Fee", feeTokenId, withFeeBuffer(feeWei))
        : toBridgeFee(feeTokenId, feeWei),
    ],
    expectedOutput,
    txInfo: {
      type: "swap-forevermoney",
      fromTokenId: leg.fromTokenId,
      toTokenId: leg.toTokenId,
      fromAmount: input.toString(),
      toAmount: (upTo ? expectedOutput : leg.outputAmount).toString(),
      to: toAddress,
      destinationStartBlock: destinationStartBlock.toString(),
    },
  }
}

// --- plan legs signed by the background ---

/**
 * The approved calldata: bridgeOut to the recipient, or bridgeOutWithFee with the partner tuple
 * pinned, with only the two amount words free. Each function carries its own gas ceiling.
 */
const boundLeg = async (
  { leg, slippage, maxSpend }: BoundLegParams,
  env: SwapEnv
): Promise<LegBound | null> => {
  const route = findForevermoneyRoute(leg.fromTokenId, leg.toTokenId)
  if (route?.direction !== "evm-to-spoke") return null
  const { signer, recipient } = leg
  if (!signer || !isEthereumAddress(signer) || !recipient || !isEthereumAddress(recipient))
    return null

  const [partnerFee, client] = await Promise.all([
    getPartnerFee(route),
    env.evmClient(route.sourceNetworkId),
  ])
  const gasPrice = await client.getGasPrice()

  const call = (fee: PartnerFee | null): LegBoundCall => ({
    template: encodeBridgeOut(route, recipient, {
      amountWei: 0n,
      partnerFee: fee,
      partnerFeeWei: 0n,
    }),
    amountSlots: [3, 5],
    maxNetworkFee: (gasCeiling(fee) * gasPrice * MAX_NETWORK_FEE_HEADROOM).toString(),
  })
  const calls: NonEmpty<LegBoundCall> = partnerFee ? [call(null), call(partnerFee)] : [call(null)]

  const floorBps = BigInt(Math.max(Math.round(slippage * Number(BPS_DENOMINATOR)), MIN_FLOOR_BPS))
  return {
    platform: "ethereum",
    chainId: Number(route.sourceNetworkId),
    signer,
    to: route.sourceGateway,
    calls,
    floor: ((leg.outputAmount * (BPS_DENOMINATOR - floorBps)) / BPS_DENOMINATOR).toString(),
    maxSpend: maxSpend.toString(),
  }
}

const decodeBridgedAmount = (route: ForevermoneyRoute, data: Hex): bigint => {
  if (route.direction === "evm-to-spoke") {
    const decoded = decodeFunctionData({ abi: abiForevermoneyAlphaGateway, data })
    if (decoded.functionName === "bridgeOut" || decoded.functionName === "bridgeOutWithFee")
      return decoded.args[3]
  } else {
    const decoded = decodeFunctionData({ abi: abiForevermoneySpokeGateway, data })
    if (
      decoded.functionName === "bridgeToFinney" ||
      decoded.functionName === "bridgeToFinneyWithFee"
    )
      return getOutputAmount(route, decoded.args[1])
  }
  throw new Error("Unexpected ForeverMoney call")
}

/** the leg lands on its source receipt, the CCIP delivery stays on the row's swap status */
const observeLeg = async (
  { leg, sent }: ObserveLegParams,
  env: SwapEnv
): Promise<LegObservation> => {
  const route = findForevermoneyRoute(leg.fromTokenId, leg.toTokenId)
  if (!route) throw new Error("Unknown ForeverMoney route")
  if (!leg.signer || !isEthereumAddress(leg.signer)) throw new Error("Invalid sender address")

  const client = await env.evmClient(route.sourceNetworkId)
  return observeEvmLeg(client, sent, leg.signer, ({ data }) => decodeBridgedAmount(route, data))
}

// --- approval ---

const getApprovalInfo = (params: ApprovalParams): ApprovalInfo => {
  const { fromTokenId, toTokenId, fromAddress, fromAmount } = params
  if (!fromTokenId || !fromAddress || !fromAmount) return null

  const route = findForevermoneyRoute(fromTokenId, toTokenId)
  if (!route || route.direction === "evm-to-spoke") return null

  return {
    contractAddress: route.sourceGateway,
    amount: fromAmount,
    tokenAddress: FOREVERMONEY_WTAO,
    chainId: Number(route.spoke.evmNetworkId),
    fromAddress,
    protocolName: PROTOCOL_NAME,
  }
}

export const forevermoneySwapModule: BackgroundSwapModule = {
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  getFromAssets: async () => [...new Set(FOREVERMONEY_ROUTES.map((route) => route.fromTokenId))],
  getToAssets: async (fromTokenId) => [
    ...new Set(
      FOREVERMONEY_ROUTES.filter((route) => !fromTokenId || route.fromTokenId === fromTokenId).map(
        (route) => route.toTokenId
      )
    ),
  ],
  getQuote,
  buildLeg,
  legDeadlineMs: LEG_DEADLINE_MS,
  boundLeg,
  observeLeg,
  getApprovalInfo,
}
