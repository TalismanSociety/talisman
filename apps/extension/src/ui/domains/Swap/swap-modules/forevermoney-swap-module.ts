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
  type ForevermoneyDirection,
  type ForevermoneyRoute,
  findForevermoneyRoute,
} from "@core/domains/forevermoney/constants"
import { evmNativeTokenId, type TokenId } from "@talismn/chaindata-provider"
import {
  frontierH160ToSs58Mirror,
  frontierSs58ToPublicKeyHex,
  isAddressEqual,
  isEthereumAddress,
} from "@talismn/crypto"
import { planckToTokens } from "@talismn/util"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { getNetworkById$ } from "@ui/state/chaindata"
import BigNumber from "bignumber.js"
import { firstValueFrom } from "rxjs"
import { encodeFunctionData, type PublicClient, zeroAddress } from "viem"
import type {
  ApprovalInfo,
  BaseQuote,
  ExchangeParams,
  GetTransactionParams,
  QuoteFee,
  QuoteParams,
  SupportedSwapProtocol,
  SwapExchange,
  SwapModule,
  SwapModuleTransaction,
} from "./common.swap-module"
import { prepareTransactionRequestWithGasCheck } from "./evm-gas-check"
import forevermoneyLogo from "./forevermoney-logo.svg?url"
import { assertNativeValueWithinInput } from "./provider-transaction-guards"

const PROTOCOL: SupportedSwapProtocol = "forevermoney"
const PROTOCOL_NAME = "ForeverMoney - Beta"
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

export type ForevermoneyQuoteData = {
  direction: ForevermoneyDirection
  fromTokenId: TokenId
  toTokenId: TokenId
  toAddress: string | null
}

/** Built on the confirmation screen: fresh fee, fresh checks and the destination block the watcher starts from */
export type ForevermoneyExchange = ForevermoneyQuoteData & {
  toAddress: string
  amountWei: string
  partnerFeeWei: string
  feeWei: string
  destinationStartBlock: string
}

type PartnerFee = { recipient: `0x${string}`; bps: number }

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

const getEvmNetwork = async (evmNetworkId: string) => {
  const network = await firstValueFrom(getNetworkById$(evmNetworkId))
  if (network?.platform !== "ethereum") throw new Error("Unknown EVM network")
  return network
}

const getEvmClient = async (evmNetworkId: string): Promise<PublicClient> =>
  getExtensionPublicClient(await getEvmNetwork(evmNetworkId))

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

const assertVaultOpen = async (route: ForevermoneyRoute) => {
  const client = await getEvmClient(FOREVERMONEY_BITTENSOR_EVM_NETWORK_ID)
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

const runChecks = async (
  sourceClient: PublicClient,
  route: ForevermoneyRoute,
  { amountWei, partnerFee }: BridgeAmounts
) => {
  const minAmountWei =
    route.direction === "evm-to-spoke" ? MIN_OUTBOUND_WEI : MIN_LIQUID_INBOUND_WEI
  if (amountWei < minAmountWei) {
    const minInputWei = partnerFee
      ? minAmountWei + getPartnerFeeWei(route, minAmountWei, partnerFee.bps)
      : minAmountWei
    throw new Error(
      `${PROTOCOL_NAME} minimum is ${planckToTokens(minInputWei.toString(), EVM_DECIMALS)} TAO`
    )
  }
  await Promise.all([assertWithinRateLimit(sourceClient, route, amountWei), assertVaultOpen(route)])
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
  ...toQuoteFee("Bridge Fee", tokenId, withFeeBuffer(feeWei)),
  additional: true,
})

const toTalismanFees = (route: ForevermoneyRoute, { partnerFeeWei }: BridgeAmounts) =>
  partnerFeeWei > 0n ? [toQuoteFee("Talisman Fee", route.fromTokenId, partnerFeeWei)] : []

const getOutputAmount = (route: ForevermoneyRoute, amountWei: bigint) =>
  route.direction === "spoke-to-substrate" ? amountWei / BITTENSOR_WEI_PER_RAO : amountWei

const getQuote = async (params: QuoteParams): Promise<BaseQuote<ForevermoneyQuoteData> | null> => {
  const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params

  const route = findForevermoneyRoute(fromTokenId, toTokenId)
  if (!route || !fromAmount || fromAmount <= 0n) return null

  const isOutbound = route.direction === "evm-to-spoke"
  const [amounts, client] = await Promise.all([
    getBridgeAmounts(route, fromAmount),
    getEvmClient(route.sourceNetworkId),
  ])

  await runChecks(client, route, amounts)

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

  return {
    protocol: PROTOCOL,
    decentralisationScore: DECENTRALISATION_SCORE,
    inputAmountBN: fromAmount,
    outputAmountBN: getOutputAmount(route, amounts.amountWei),
    fees,
    talismanFee: amounts.partnerFee ? amounts.partnerFee.bps / Number(BPS_DENOMINATOR) : undefined,
    timeInSec: isOutbound ? OUTBOUND_DURATION_SEC : INBOUND_DURATION_SEC,
    providerLogo: forevermoneyLogo,
    providerName: PROTOCOL_NAME,
    notice: NOTICE,
    maxNativeTokenGasBuffer:
      isOutbound && feeWei !== null ? withFeeBuffer(feeWei).toString() : undefined,
    data: {
      direction: route.direction,
      fromTokenId: route.fromTokenId,
      toTokenId: route.toTokenId,
      toAddress,
    },
  }
}

// --- exchange (re-quote on the confirmation screen) ---

const createExchange = async (params: ExchangeParams): Promise<SwapExchange | null> => {
  const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params

  const route = findForevermoneyRoute(fromTokenId, toTokenId)
  if (!route) return null
  if (!fromAddress || !isEthereumAddress(fromAddress)) throw new Error("Invalid sender address")
  if (!toAddress) throw new Error("Missing recipient")
  if (
    route.direction === "spoke-to-substrate"
      ? !isSubstrateAddress(toAddress)
      : !isEthereumAddress(toAddress)
  )
    throw new Error("Invalid recipient")

  const [amounts, sourceClient, destinationClient] = await Promise.all([
    getBridgeAmounts(route, fromAmount),
    getEvmClient(route.sourceNetworkId),
    getEvmClient(route.destinationNetworkId),
  ])

  await runChecks(sourceClient, route, amounts)

  const [feeWei, destinationStartBlock] = await Promise.all([
    readCcipFeeWei(sourceClient, route, amounts, fromAddress, toAddress),
    destinationClient.getBlockNumber(),
  ])

  return {
    protocol: PROTOCOL,
    fees: [
      ...toTalismanFees(route, amounts),
      toBridgeFee(evmNativeTokenId(route.sourceNetworkId), feeWei),
    ],
    data: {
      direction: route.direction,
      fromTokenId: route.fromTokenId,
      toTokenId: route.toTokenId,
      toAddress,
      amountWei: amounts.amountWei.toString(),
      partnerFeeWei: amounts.partnerFeeWei.toString(),
      feeWei: feeWei.toString(),
      destinationStartBlock: destinationStartBlock.toString(),
    },
  }
}

// --- transaction ---

const getTransaction = async (
  params: GetTransactionParams
): Promise<SwapModuleTransaction | null> => {
  const { fromTokenId, fromAddress, fromAmount, exchange, context, toAddress } = params

  const data = exchange as ForevermoneyExchange | undefined
  if (
    !data?.toAddress ||
    !data.amountWei ||
    !data.partnerFeeWei ||
    !data.feeWei ||
    data.fromTokenId !== fromTokenId
  )
    throw new Error("Please select the quote again")
  if (toAddress && !isAddressEqual(toAddress, data.toAddress))
    throw new Error("Please select the quote again")

  const route = findForevermoneyRoute(data.fromTokenId, data.toTokenId)
  if (!route || route.direction !== data.direction) throw new Error("Please select the quote again")

  if (context.platform !== "ethereum") throw new Error("Missing EVM context")
  if (!isEthereumAddress(fromAddress)) throw new Error("Invalid sender address")

  const feeWei = BigInt(data.feeWei)
  const feeWithBuffer = withFeeBuffer(feeWei)
  const amounts = await getBridgeAmounts(route, fromAmount)
  if (
    amounts.amountWei !== BigInt(data.amountWei) ||
    amounts.partnerFeeWei !== BigInt(data.partnerFeeWei)
  )
    throw new Error("Please select the quote again")

  const isOutbound = route.direction === "evm-to-spoke"
  if (isOutbound) {
    assertNativeValueWithinInput({
      value: amounts.amountWei + amounts.partnerFeeWei,
      fromAmount,
      isNativeInput: true,
    })
    if (feeWithBuffer > withFeeBuffer(MAX_CCIP_FEE_WEI_BITTENSOR))
      throw new Error("Bridge fee is unexpectedly high")
    if (!isEthereumAddress(data.toAddress)) throw new Error("Invalid recipient")
  } else if (feeWithBuffer > withFeeBuffer(MAX_CCIP_FEE_WEI_SPOKE)) {
    throw new Error("Bridge fee is unexpectedly high")
  }

  const network = await getEvmNetwork(route.sourceNetworkId)
  const publicClient = getExtensionPublicClient(network)

  const transaction = await prepareTransactionRequestWithGasCheck(
    publicClient,
    network.nativeTokenId,
    {
      chain: null,
      account: fromAddress,
      to: route.sourceGateway,
      data: isOutbound
        ? encodeBridgeOut(route, data.toAddress as `0x${string}`, amounts)
        : encodeBridgeToFinney(amounts, getDestinationPubkey(route, data.toAddress), fromAddress),
      value: getTransactionValue(route, amounts, feeWei),
    }
  )

  return { platform: "ethereum", transaction }
}

// --- approval ---

const getApprovalInfo = (
  params: QuoteParams & { quoteData: BaseQuote | BaseQuote[] | null }
): ApprovalInfo => {
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

export const forevermoneySwapModule: SwapModule = {
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
  createExchange,
  getTransaction,
  getApprovalInfo,
}
