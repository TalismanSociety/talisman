import { log } from "@common/log"
import { BITTENSOR_SS58_PREFIX, BITTENSOR_WEI_PER_RAO } from "@core/domains/bittensor/constants"
import {
  abiCcipTokenPool,
  abiForevermoneyAlphaGateway,
  abiForevermoneyAlphaVault,
  abiForevermoneySpokeGateway,
} from "@core/domains/forevermoney/abi"
import {
  FOREVERMONEY_ALPHA_GATEWAY,
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
import forevermoneyLogo from "./forevermoney-logo.png?url"
import { assertNativeValueWithinInput } from "./provider-transaction-guards"

const PROTOCOL: SupportedSwapProtocol = "forevermoney"
const PROTOCOL_NAME = "ForeverMoney (Experimental)"
const DECENTRALISATION_SCORE = 2
const OUTBOUND_DURATION_SEC = 180
const INBOUND_DURATION_SEC = 1800
const EVM_DECIMALS = 18
const NOTICE =
  "Experimental bridge operated by ForeverMoney over Chainlink CCIP. Bridged TAO is backed by root-staked TAO."
const INBOUND_NOTE = "Transfers to Bittensor take 15 to 30 minutes"
const OUTBOUND_NOTE = "Transfers from Bittensor take 2 to 3 minutes"

// CCIP fee is a fraction of a cent to a dollar; anything above these caps means a broken quote
const MAX_CCIP_FEE_WEI_SPOKE = 10n ** 16n // 0.01 ETH
const MAX_CCIP_FEE_WEI_BITTENSOR = 10n ** 17n // 0.1 TAO
// contracts refund the unused part of the fee, the SDK sends the same 2% buffer
const FEE_BUFFER_NUMERATOR = 102n
const FEE_BUFFER_DENOMINATOR = 100n
const MIN_LIQUID_INBOUND_WEI = 10n ** 16n // 0.01 TAO, the vault must unstake the bridged position

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
  feeWei: string
  destinationStartBlock: string
}

// --- helpers ---

const toWholeRao = (wei: bigint) => (wei / BITTENSOR_WEI_PER_RAO) * BITTENSOR_WEI_PER_RAO

const withFeeBuffer = (fee: bigint) => (fee * FEE_BUFFER_NUMERATOR) / FEE_BUFFER_DENOMINATOR

const getEvmClient = async (evmNetworkId: string): Promise<PublicClient> => {
  const network = await firstValueFrom(getNetworkById$(evmNetworkId))
  if (network?.platform !== "ethereum") throw new Error("Unknown EVM network")
  return getExtensionPublicClient(network)
}

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

const encodeBridgeToFinney = (
  amountWei: bigint,
  destinationPubkey: `0x${string}`,
  evmFallback: `0x${string}`
) =>
  encodeFunctionData({
    abi: abiForevermoneySpokeGateway,
    functionName: "bridgeToFinney",
    args: [
      FOREVERMONEY_WTAO,
      amountWei,
      { ss58: destinationPubkey, evmFallback, wantLiquid: true, minTaoOut: amountWei },
    ],
  })

const encodeBridgeOut = (route: ForevermoneyRoute, recipient: `0x${string}`, amountWei: bigint) =>
  encodeFunctionData({
    abi: abiForevermoneyAlphaGateway,
    functionName: "bridgeOut",
    args: [route.spoke.selector, FOREVERMONEY_ALPHA_TOKEN, recipient, amountWei, 0n, amountWei],
  })

// --- on-chain reads ---

const readCcipFeeWei = async (
  client: PublicClient,
  route: ForevermoneyRoute,
  amountWei: bigint,
  fromAddress: `0x${string}`,
  toAddress: string | null
): Promise<bigint> => {
  if (route.direction === "evm-to-spoke") {
    const recipient = toAddress && isEthereumAddress(toAddress) ? toAddress : fromAddress
    const fee = await client.readContract({
      abi: abiForevermoneyAlphaGateway,
      address: FOREVERMONEY_ALPHA_GATEWAY,
      functionName: "quoteBridgeOut",
      args: [route.spoke.selector, FOREVERMONEY_ALPHA_TOKEN, recipient, amountWei],
    })
    if (fee > MAX_CCIP_FEE_WEI_BITTENSOR) throw new Error("Bridge fee is unexpectedly high")
    return fee
  }

  const destinationPubkey = getQuoteDestinationPubkey(route, fromAddress, toAddress)
  const fee = await client.readContract({
    abi: abiForevermoneySpokeGateway,
    address: route.spoke.gateway,
    functionName: "quoteBridgeToFinney",
    args: [
      FOREVERMONEY_WTAO,
      amountWei,
      { ss58: destinationPubkey, evmFallback: fromAddress, wantLiquid: true, minTaoOut: amountWei },
    ],
  })
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
      address: FOREVERMONEY_ALPHA_GATEWAY,
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
  amountWei: bigint
) => {
  if (route.direction !== "evm-to-spoke" && amountWei < MIN_LIQUID_INBOUND_WEI)
    throw new Error(
      `${PROTOCOL_NAME} minimum is ${planckToTokens(MIN_LIQUID_INBOUND_WEI.toString(), EVM_DECIMALS)} TAO`
    )
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

const getOutputAmount = (route: ForevermoneyRoute, amountWei: bigint) =>
  route.direction === "spoke-to-substrate" ? amountWei / BITTENSOR_WEI_PER_RAO : amountWei

const getQuote = async (params: QuoteParams): Promise<BaseQuote<ForevermoneyQuoteData> | null> => {
  const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params

  const route = findForevermoneyRoute(fromTokenId, toTokenId)
  if (!route || !fromAmount || fromAmount <= 0n) return null

  const isOutbound = route.direction === "evm-to-spoke"
  const amountWei = toWholeRao(fromAmount)
  const client = await getEvmClient(route.sourceNetworkId)

  await runChecks(client, route, amountWei)

  const feeTokenId = evmNativeTokenId(route.sourceNetworkId)
  const fees: QuoteFee[] = []
  let feeWei: bigint | null = null

  if (fromAddress && isEthereumAddress(fromAddress)) {
    feeWei = await readCcipFeeWei(client, route, amountWei, fromAddress, toAddress)
    fees.push(toQuoteFee("Bridge Fee", feeTokenId, feeWei))

    const recipient = toAddress && isEthereumAddress(toAddress) ? toAddress : fromAddress
    const gasFeeWei = await estimateGasFeeWei(client, {
      account: fromAddress,
      to: isOutbound ? FOREVERMONEY_ALPHA_GATEWAY : route.spoke.gateway,
      data: isOutbound
        ? encodeBridgeOut(route, recipient, amountWei)
        : encodeBridgeToFinney(
            amountWei,
            getQuoteDestinationPubkey(route, fromAddress, toAddress),
            fromAddress
          ),
      value: isOutbound ? amountWei + withFeeBuffer(feeWei) : withFeeBuffer(feeWei),
    })
    if (gasFeeWei !== null) fees.push(toQuoteFee("Est. Gas Fees", feeTokenId, gasFeeWei))
  }

  return {
    protocol: PROTOCOL,
    decentralisationScore: DECENTRALISATION_SCORE,
    inputAmountBN: fromAmount,
    outputAmountBN: getOutputAmount(route, amountWei),
    fees,
    timeInSec: isOutbound ? OUTBOUND_DURATION_SEC : INBOUND_DURATION_SEC,
    providerLogo: forevermoneyLogo,
    providerName: PROTOCOL_NAME,
    note: isOutbound ? OUTBOUND_NOTE : INBOUND_NOTE,
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

  const amountWei = toWholeRao(fromAmount)
  const [sourceClient, destinationClient] = await Promise.all([
    getEvmClient(route.sourceNetworkId),
    getEvmClient(route.destinationNetworkId),
  ])

  await runChecks(sourceClient, route, amountWei)

  const [feeWei, destinationStartBlock] = await Promise.all([
    readCcipFeeWei(sourceClient, route, amountWei, fromAddress, toAddress),
    destinationClient.getBlockNumber(),
  ])

  return {
    protocol: PROTOCOL,
    data: {
      direction: route.direction,
      fromTokenId: route.fromTokenId,
      toTokenId: route.toTokenId,
      toAddress,
      amountWei: amountWei.toString(),
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
  if (!data?.toAddress || !data.amountWei || data.fromTokenId !== fromTokenId)
    throw new Error("Please select the quote again")
  if (toAddress && !isAddressEqual(toAddress, data.toAddress))
    throw new Error("Please select the quote again")

  const route = findForevermoneyRoute(data.fromTokenId, data.toTokenId)
  if (!route || route.direction !== data.direction) throw new Error("Please select the quote again")

  if (context.platform !== "ethereum") throw new Error("Missing EVM context")
  if (!isEthereumAddress(fromAddress)) throw new Error("Invalid sender address")

  const amountWei = BigInt(data.amountWei)
  const feeWithBuffer = withFeeBuffer(BigInt(data.feeWei))
  if (amountWei !== toWholeRao(fromAmount)) throw new Error("Please select the quote again")

  const isOutbound = route.direction === "evm-to-spoke"
  if (isOutbound) {
    assertNativeValueWithinInput({ value: amountWei, fromAmount, isNativeInput: true })
    if (feeWithBuffer > withFeeBuffer(MAX_CCIP_FEE_WEI_BITTENSOR))
      throw new Error("Bridge fee is unexpectedly high")
    if (!isEthereumAddress(data.toAddress)) throw new Error("Invalid recipient")
  } else if (feeWithBuffer > withFeeBuffer(MAX_CCIP_FEE_WEI_SPOKE)) {
    throw new Error("Bridge fee is unexpectedly high")
  }

  const network = await firstValueFrom(getNetworkById$(route.sourceNetworkId))
  if (network?.platform !== "ethereum") throw new Error("Unknown EVM network")
  const publicClient = getExtensionPublicClient(network)

  const transaction = await prepareTransactionRequestWithGasCheck(
    publicClient,
    network.nativeTokenId,
    {
      chain: null,
      account: fromAddress,
      to: isOutbound ? FOREVERMONEY_ALPHA_GATEWAY : route.spoke.gateway,
      data: isOutbound
        ? encodeBridgeOut(route, data.toAddress as `0x${string}`, amountWei)
        : encodeBridgeToFinney(amountWei, getDestinationPubkey(route, data.toAddress), fromAddress),
      value: isOutbound ? amountWei + feeWithBuffer : feeWithBuffer,
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
    contractAddress: route.spoke.gateway,
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
