import type { Chain as ViemChain } from "viem/chains"
import { MultiAddress } from "@polkadot-api/descriptors"
import {
  chainConnectorsAtom,
  evmNativeTokenId,
  subAssetTokenId,
  subNativeTokenId,
} from "@talismn/balances-react"
import { encodeAnyAddress, isAddressEqual, isEthereumAddress } from "@talismn/crypto"
import { ScaleApi } from "@talismn/sapi"
import BigNumber from "bignumber.js"
import { UNKNOWN_TOKEN_URL } from "extension-shared"
import { atom, ExtractAtomValue } from "jotai"
import { atomWithObservable, loadable } from "jotai/utils"
import createClient from "openapi-fetch"
import {
  catchError,
  defer,
  interval,
  Observable,
  of,
  retry,
  startWith,
  switchMap,
  takeWhile,
} from "rxjs"
import { encodeFunctionData, erc20Abi, publicActions, TransactionRequest } from "viem"
import {
  arbitrum,
  arbitrumNova,
  base,
  bsc,
  mainnet,
  manta,
  moonbeam,
  opBNB,
  optimism,
  polygon,
  theta,
  zksync,
} from "viem/chains"

import { accounts$, getNetworks$, getNetworksMapById$, getToken$, getTokensMap$ } from "@ui/state"

import type { QuoteFee, QuoteResponse } from "./common.swap-module.ts"
import type {
  paths as StealthexApi,
  SchemaCurrency as StealthexCurrency,
  SchemaExchange as StealthexExchange,
} from "./stealthex.api.d.ts"
import { apiPromiseAtom } from "../swaps-port/apiPromiseAtom"
import { Decimal } from "../swaps-port/Decimal"
import { publicClientAtomFamily } from "../swaps-port/publicClientAtomFamily"
import { vanaMainnet } from "../swaps-port/vana"
import {
  BaseQuote,
  fromAddressAtom,
  fromAmountAtom,
  fromAssetAtom,
  GetEstimateGasTxFunction,
  getTokenIdForSwappableAsset,
  QuoteFunction,
  SupportedSwapProtocol,
  SwapModule,
  SwappableAssetBaseType,
  SwappableAssetWithDecimals,
  swapQuoteRefresherAtom,
  toAddressAtom,
  toAssetAtom,
  validateAddress,
} from "./common.swap-module"
import stealthexLogo from "./stealthex-logo.svg?url"

const apiUrl = "https://stealthex.talisman.xyz"
export const PROTOCOL: SupportedSwapProtocol = "stealthex" as const
export const PROTOCOL_NAME = "StealthEX"
const DECENTRALISATION_SCORE = 1.5
type FeeProps = { fromAsset: SwappableAssetBaseType; toAsset: SwappableAssetBaseType }
const getTalismanTotalFee = ({ fromAsset, toAsset }: FeeProps) => {
  const isSubToOrFromEvm =
    (fromAsset.networkType === "substrate" && toAsset.networkType === "evm") ||
    (fromAsset.networkType === "evm" && toAsset.networkType === "substrate")

  const isSubToOrFromSub =
    (fromAsset.networkType === "substrate" && toAsset.networkType === "substrate") ||
    (fromAsset.networkType === "substrate" && toAsset.networkType === "substrate")

  const isEvmToOrFromEvm =
    (fromAsset.networkType === "evm" && toAsset.networkType === "evm") ||
    (fromAsset.networkType === "evm" && toAsset.networkType === "evm")

  const isToOrFromBtc = fromAsset.networkType === "btc" || toAsset.networkType === "btc"

  if (isSubToOrFromEvm) return 0.006 // 0.6% total fee for sub<>evm
  if (isSubToOrFromSub) return 0.005 // 0.5% total fee for sub<>sub
  if (isEvmToOrFromEvm) return 0.002 // 0.2% total fee for evm<>evm (NOTE: will actually be 0.4%, as that is the minimum we can set via stealthex for now)
  if (isToOrFromBtc) return 0.015 // 1.5% total fee for any<>btc
  return 0.01 // 1.0% total fee by default
}
const BUILT_IN_FEE = 0.004 // StealthEX always includes an affiliate fee of 0.4%
const getAdditionalFee = (feeProps: FeeProps) =>
  Math.max(
    // we want a total fee of x,
    // so get the total talisman fee for this route,
    // then subtract the built-in fee of 0.4%, which is applied to all exchanges made via stealthex
    getTalismanTotalFee(feeProps) - BUILT_IN_FEE,
    // if the talisman total fee is less than the built-in fee, default to an additional_fee of 0.0
    0,
  )
// Our UI represents a 1% fee as `0.01`, but the StealthEX api represents a 1% fee as `1.0`.
// 1.0 = 0.01 * 100
const decimalToPercent = (decimal: number) => Math.round(decimal * 100 * 100) / 100
const getAdditionalFeePercent = (feeProps: FeeProps) => decimalToPercent(getAdditionalFee(feeProps)) // to percent

const LOGO = stealthexLogo

type AssetContext = {
  network: string
  symbol: string
}

const supportedEvmChains: Record<string, ViemChain | undefined> = {
  arbitrum,
  arbnova: arbitrumNova,
  base,
  bsc,
  eth: mainnet,
  glmr: moonbeam,
  manta,
  matic: polygon,
  opbnb: opBNB,
  optimism,
  theta,
  vana: vanaMainnet,
  zksync,
}

/**
 * specialAssets list defines a mappings of assets from stealthex to our internal asset representation.
 * Many assets on stealthex are not tradeable in an onchain context because they dont come with contract addresses.
 * To avoid displaying a token which we dont have contract address for (which could result in a bunch of issues like, not being able to display the token balance, not being able to transfer the token for swapping and etc),
 * We support mainly 2 types of assets:
 * - ERC20 tokens: we only support ERC20 tokens from stealthex that comes with contract addresses
 * - Special assets: all substrate and evm native assets from stealthex are whitelisted as special assets
 */
const specialAssets: Record<string, Omit<SwappableAssetBaseType, "context">> = {
  "mainnet::dot": {
    id: subNativeTokenId("polkadot-asset-hub"),
    name: "Polkadot Asset Hub",
    symbol: "DOT",
    chainId: "polkadot-asset-hub",
    networkType: "substrate",
  },
  "polkadot::ksm": {
    id: subNativeTokenId("kusama-asset-hub"),
    name: "Kusama Asset Hub",
    symbol: "KSM",
    chainId: "kusama-asset-hub",
    networkType: "substrate",
  },
  "polkadot::usdt": {
    id: subAssetTokenId("polkadot-asset-hub", "1984"),
    name: "USDT (Polkadot)",
    chainId: "polkadot-asset-hub",
    symbol: "USDT",
    networkType: "substrate",
    assetHubAssetId: "1984",
  },
  "polkadot::usdc": {
    id: subAssetTokenId("polkadot-asset-hub", "1337"),
    name: "USDC (Polkadot)",
    chainId: "polkadot-asset-hub",
    symbol: "USDC",
    networkType: "substrate",
    assetHubAssetId: "1337",
  },
  "mainnet::eth": {
    id: evmNativeTokenId("1"),
    name: "Ethereum",
    chainId: 1,
    symbol: "ETH",
    networkType: "evm",
  },
  "arbitrum::eth": {
    id: evmNativeTokenId("42161"),
    name: "Ethereum",
    chainId: 42161,
    symbol: "ETH",
    networkType: "evm",
  },
  "arbnova::eth": {
    id: evmNativeTokenId("42170"),
    name: "Ethereum",
    chainId: 42170,
    symbol: "ETH",
    networkType: "evm",
  },
  "base::eth": {
    id: evmNativeTokenId("8453"),
    name: "Ethereum",
    chainId: 8453,
    symbol: "ETH",
    networkType: "evm",
  },
  "bsc::eth": {
    id: evmNativeTokenId("56"),
    name: "Ethereum",
    chainId: 56,
    symbol: "ETH",
    networkType: "evm",
  },
  "optimism::eth": {
    id: evmNativeTokenId("10"),
    name: "Ethereum",
    chainId: 10,
    symbol: "ETH",
    networkType: "evm",
  },
  "mainnet::vana": {
    id: evmNativeTokenId("1480"),
    name: "Vana",
    chainId: 1480,
    symbol: "VANA",
    networkType: "evm",
  },
  "manta::eth": {
    id: evmNativeTokenId("169"),
    name: "Ethereum (Manta Pacific)",
    chainId: 169,
    symbol: "ETH",
    networkType: "evm",
  },
  "zksync::eth": {
    id: evmNativeTokenId("324"),
    name: "Ethereum",
    chainId: 324,
    symbol: "ETH",
    networkType: "evm",
  },
  "mainnet::tao": {
    id: subNativeTokenId("bittensor"),
    name: "Bittensor",
    chainId: "bittensor",
    symbol: "TAO",
    networkType: "substrate",
  },
  "mainnet::btc": {
    id: "btc-native",
    name: "Bitcoin",
    chainId: "bitcoin",
    symbol: "BTC",
    networkType: "btc",
  },
  "mainnet::astr": {
    id: subNativeTokenId("astar"),
    name: "Astar",
    symbol: "ASTR",
    chainId: "astar",
    networkType: "substrate",
  },
  "mainnet::azero": {
    id: subNativeTokenId("aleph-zero"),
    name: "Aleph Zero",
    symbol: "AZERO",
    chainId: "aleph-zero",
    networkType: "substrate",
  },
  "mainnet::aca": {
    id: subNativeTokenId("acala"),
    name: "ACALA",
    symbol: "ACA",
    chainId: "acala",
    networkType: "substrate",
  },
}

const api = createClient<StealthexApi>({ baseUrl: apiUrl })
const stealthexSdk = {
  getAllCurrencies: async (): Promise<StealthexCurrency[]> => {
    const allCurrencies: StealthexCurrency[] = []

    // TODO: When worker cache isn't warm, this takes too long to fetch all requests.
    const limit = 250
    for (let offset = 0; ; offset += limit) {
      const { data: currencies } = await api.GET("/v4/currencies", {
        params: { query: { limit, offset } },
      })
      if (!Array.isArray(currencies)) break

      allCurrencies.push(...currencies)
      if (currencies.length !== 250) break
    }

    return allCurrencies
  },
  getPairs: async ({
    symbol,
    network,
  }: {
    symbol: string
    network: string
  }): Promise<StealthexCurrency["available_routes"]> => {
    const { data: currency, error } = await api.GET("/v4/currencies/{symbol}/{network}", {
      params: { path: { symbol, network }, query: { include_available_routes: "true" } },
    })
    if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
    return currency?.available_routes
  },
  getRange: async ({
    route,
    estimation,
    rate,
    additional_fee_percent,
  }: {
    route: { from: { network: string; symbol: string }; to: { network: string; symbol: string } }
    estimation?: "direct" | "reversed"
    rate?: "floating" | "fixed"
    additional_fee_percent?: number
  }): Promise<{ min: BigNumber }> => {
    // default values
    estimation ||= "direct"
    rate ||= "floating"

    const params = {
      route,
      estimation,
      rate,
      additional_fee_percent,
    }
    if (params.additional_fee_percent === undefined) delete params.additional_fee_percent
    if (params.additional_fee_percent === 0.0) delete params.additional_fee_percent

    const { data: range, error } = await api.POST("/v4/rates/range", { body: params })
    if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
    return { min: BigNumber(range?.min_amount ?? 0) }
  },
  getEstimate: async ({
    route,
    amount,
    estimation,
    rate,
    additional_fee_percent,
  }: {
    route: { from: { network: string; symbol: string }; to: { network: string; symbol: string } }
    amount: number
    estimation?: "direct" | "reversed"
    rate?: "floating" | "fixed"
    additional_fee_percent?: number
  }): Promise<number> => {
    // default values
    estimation ||= "direct"
    rate ||= "floating"

    const params = {
      route,
      amount,
      estimation,
      rate,
      additional_fee_percent,
    }
    if (params.additional_fee_percent === undefined) delete params.additional_fee_percent
    if (params.additional_fee_percent === 0.0) delete params.additional_fee_percent

    const { data: estimate, error } = await api.POST("/v4/rates/estimated-amount", { body: params })
    if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
    return estimate?.estimated_amount
  },
  createExchange: async ({
    route,
    amount,
    estimation,
    rate,
    address,
    extra_id,
    refund_address,
    refund_extra_id,
    additional_fee_percent,
  }: {
    route: { from: { network: string; symbol: string }; to: { network: string; symbol: string } }
    amount: number
    estimation?: "direct" | "reversed"
    rate?: "floating" | "fixed"
    address: string
    extra_id?: string
    refund_address?: string
    refund_extra_id?: string
    additional_fee_percent?: number
  }): Promise<StealthexExchange> => {
    // default values
    estimation ||= "direct"
    rate ||= "floating"

    const params = {
      route,
      amount,
      estimation,
      rate,
      address,
      extra_id,
      refund_address,
      refund_extra_id,
      additional_fee_percent,
    }
    if (extra_id === undefined) delete params.extra_id
    if (refund_address === undefined) delete params.refund_address
    if (refund_extra_id === undefined) delete params.refund_extra_id
    if (params.additional_fee_percent === undefined) delete params.additional_fee_percent
    if (params.additional_fee_percent === 0.0) delete params.additional_fee_percent

    const { data: exchange, error } = await api.POST("/v4/exchanges", { body: params })
    if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
    return exchange
  },
  getExchange: async (id: string): Promise<StealthexExchange> => {
    const { data: exchange, error } = await api.GET("/v4/exchanges/{id}", {
      params: { path: { id } },
    })
    if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
    return exchange
  },
}

const assetsAtom = atom(async (get) => {
  const allCurrencies = await stealthexSdk.getAllCurrencies()

  const supportedTokens = allCurrencies.filter((currency) => {
    const isEvmNetwork = !!supportedEvmChains[currency.network]
    const isSpecialAsset = !!specialAssets[`${currency.network}::${currency.symbol}`]

    // evm assets must be whitelisted as a special asset or have a contract address
    if (isEvmNetwork) return isSpecialAsset || !!currency.contract_address

    // substrate assets must be whitelisted as a special asset
    return isSpecialAsset
  })
  const knownTokens = await get(atomWithObservable(() => getTokensMap$()))

  return Object.values(
    supportedTokens.reduce(
      (acc, currency) => {
        const evmChain = supportedEvmChains[currency.network]
        const specialAsset = specialAssets[`${currency.network}::${currency.symbol}`]

        const id = evmChain
          ? getTokenIdForSwappableAsset(
              "evm",
              evmChain.id,
              currency.contract_address ? currency.contract_address : undefined,
            )
          : specialAsset?.id
        const chainId = evmChain ? evmChain.id : specialAsset?.chainId
        if (!id || !chainId) return acc

        const image =
          (knownTokens[id]?.logo !== UNKNOWN_TOKEN_URL ? knownTokens[id]?.logo : undefined) ??
          currency.icon_url
        const asset: SwappableAssetBaseType<{ stealthex: AssetContext }> = {
          id,
          name: specialAsset?.name ?? currency.name,
          symbol: specialAsset?.symbol ?? currency.symbol,
          decimals:
            specialAsset?.decimals ??
            evmChain?.nativeCurrency?.decimals ??
            currency?.precision ??
            undefined,
          chainId,
          contractAddress: currency.contract_address ? currency.contract_address : undefined,
          image,
          networkType: evmChain ? "evm" : (specialAsset?.networkType ?? "substrate"),
          assetHubAssetId: specialAsset?.assetHubAssetId,
          context: {
            stealthex: {
              network: currency.network,
              symbol: currency.symbol,
            },
          },
        }
        return { ...acc, [id]: asset }
      },
      {} as Record<string, SwappableAssetBaseType<{ stealthex: AssetContext }>>,
    ),
  )
})

const pairKeyFromPair = (pair: Awaited<ExtractAtomValue<typeof pairsAtom>>[number]) =>
  `${pair.network}::${pair.symbol}`
const pairKeyFromAsset = (asset: SwappableAssetBaseType) =>
  asset && `${asset.context?.stealthex?.network}::${asset.context?.stealthex?.symbol}`

const pairsAtom = atom(async (get) => {
  const fromAsset = get(fromAssetAtom)
  const { symbol, network } = fromAsset?.context?.stealthex ?? {}
  if (!symbol || !network) return [] // not supported

  const pairs = await stealthexSdk.getPairs({ symbol, network })
  if (!pairs || !Array.isArray(pairs)) return []

  return pairs
})

const routeHasCustomFeeAtom = atom(async (get) => {
  const pairs = await get(pairsAtom)
  if (!pairs || !Array.isArray(pairs)) return false

  const toAsset = get(toAssetAtom)
  if (!toAsset || !toAsset.context.stealthex) return false
  if (!("stealthex" in toAsset.context)) return false

  const toAssetKey = pairKeyFromAsset(toAsset)
  const pair = pairs.find((pair) => pairKeyFromPair(pair) === toAssetKey)
  if (!pair) return false

  return !!pair.features.includes("custom_fee")
})

const fromAssetsSelector = atom(async (get) => await get(assetsAtom))
const toAssetsSelector = atom(async (get) => {
  const allAssets = await get(assetsAtom)
  const fromAsset = get(fromAssetAtom)
  if (!fromAsset) return allAssets

  const pairs = await get(pairsAtom)
  if (!pairs || !Array.isArray(pairs)) return []

  const validDestinations = new Set(pairs.map(pairKeyFromPair))
  const validDestAssets = allAssets.filter((asset) =>
    validDestinations.has(pairKeyFromAsset(asset)),
  )

  return [fromAsset, ...validDestAssets]
})

const quote: QuoteFunction = loadable(
  atom(async (get): Promise<(BaseQuote & { data?: QuoteResponse }) | null> => {
    const fromAsset = get(fromAssetAtom)
    const toAsset = get(toAssetAtom)
    const fromAmount = get(fromAmountAtom)
    const routeHasCustomFee = await get(routeHasCustomFeeAtom)

    if (!fromAsset || !toAsset || !fromAmount || fromAmount.planck === 0n) return null
    const from: AssetContext = fromAsset.context.stealthex
    const to: AssetContext = toAsset.context.stealthex
    if (!from || !to) return null

    // force refresh
    get(swapQuoteRefresherAtom)

    const additional_fee_percent = routeHasCustomFee
      ? getAdditionalFeePercent({ fromAsset, toAsset })
      : undefined
    const range = await stealthexSdk.getRange({ route: { from, to }, additional_fee_percent })
    if (range && range.min.isGreaterThan(fromAmount.toString()))
      throw new Error(`StealthEX minimum is ${range.min.toString()} ${fromAsset.symbol}`)

    try {
      // TODO: Return `null` or an error when getRange / getEstimate fails
      // Error format: `return { decentralisationScore: DECENTRALISATION_SCORE, protocol: PROTOCOL, inputAmountBN: fromAmount.planck, outputAmountBN: 0n, error: '<error here>', timeInSec: 5 * 60, fees: [], providerLogo: LOGO, providerName: PROTOCOL_NAME, talismanFee: Math.max(getTalismanTotalFee({ fromAsset, toAsset }), BUILT_IN_FEE), }`
      const estimate = await stealthexSdk.getEstimate({
        route: { from, to },
        amount: fromAmount.toNumber(),
        additional_fee_percent,
      })

      const gasFee = await estimateGas(get)
      // relative fee, multiply by fromAmount to get planck fee
      const talismanFee = Math.max(getTalismanTotalFee({ fromAsset, toAsset }), BUILT_IN_FEE)
      // add talisman fee
      const fees: QuoteFee[] = (gasFee ? [gasFee] : []).concat({
        amount: BigNumber(fromAmount.planck.toString())
          .times(10 ** -fromAmount.decimals)
          .times(talismanFee),
        name: "Talisman Fee",
        tokenId: fromAsset.id,
      })

      return {
        decentralisationScore: DECENTRALISATION_SCORE,
        protocol: PROTOCOL,
        inputAmountBN: fromAmount.planck,
        outputAmountBN: Decimal.fromUserInput(String(estimate), toAsset.decimals).planck,
        // simpleswap swaps take about 5mins, assuming here that stealthex takes a similar amount of time
        timeInSec: 5 * 60,
        fees,
        providerLogo: LOGO,
        providerName: PROTOCOL_NAME,
        talismanFee,
      }
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.error(`Failed to get StealthEX quote`, cause)
      return null
    }
  }),
)

export type { StealthexExchange }
const exchangeAtom = atom(async (get): Promise<StealthexExchange | undefined> => {
  try {
    const substrateChains = await get(
      atomWithObservable(() => getNetworks$({ platform: "polkadot" })),
    )
    const formatAddress = (
      address: string | null,
      asset: SwappableAssetWithDecimals<unknown> | null,
    ) => {
      if (!address) return address
      if (asset?.networkType !== "substrate") return address

      const substrateChain = substrateChains.find(
        (c) => c.id.toString() === asset.chainId.toString(),
      )
      if (!substrateChain) return address
      return encodeAnyAddress(address, { ss58Format: substrateChain.prefix })
    }

    const fromAsset = get(fromAssetAtom)
    const toAsset = get(toAssetAtom)
    if (!fromAsset) throw new Error("Missing from asset")
    if (!toAsset) throw new Error("Missing to asset")

    const allAccounts = await get(atomWithObservable(() => accounts$))

    const fromAddress = formatAddress(get(fromAddressAtom), fromAsset)
    const toAddress = formatAddress(get(toAddressAtom), toAsset)
    if (!fromAddress) throw new Error("Missing from address")
    if (!toAddress) throw new Error("Missing to address")

    const amount = get(fromAmountAtom)

    const from: AssetContext = fromAsset.context.stealthex
    const to: AssetContext = toAsset.context.stealthex
    if (!from) throw new Error("Missing route from")
    if (!to) throw new Error("Missing route to")

    // validate from address for the source chain
    const fromAccount = allAccounts.find((account) => isAddressEqual(account.address, fromAddress))
    const fromChain = substrateChains.find((c) => c.id.toString() === String(fromAsset.chainId))
    if (!validateAddress(fromAccount, fromAddress, fromChain, fromAsset.networkType))
      throw new Error(`Cannot swap from ${fromAsset.chainId} chain with address: ${fromAddress}`)

    // validate to address for the target chain
    const toAccount = allAccounts.find((account) => isAddressEqual(account.address, toAddress))
    const toChain = substrateChains.find((c) => c.id.toString() === String(toAsset.chainId))
    if (!validateAddress(toAccount, toAddress, toChain, toAsset.networkType))
      throw new Error(`Cannot swap to ${toAsset.chainId} chain with address: ${toAddress}`)

    // cannot swap from BTC
    if (fromAsset.networkType === "btc") throw new Error("Swapping from BTC is not supported.")

    const routeHasCustomFee = await get(routeHasCustomFeeAtom)

    const additional_fee_percent = routeHasCustomFee
      ? getAdditionalFeePercent({ fromAsset, toAsset })
      : undefined
    const exchange = await stealthexSdk.createExchange({
      route: { from, to },
      amount: amount.toNumber(),
      address: toAddress,
      additional_fee_percent,
    })
    if (!exchange) throw new Error("Error creating exchange")

    // if (exchange.code === 422) {
    //   const min = exchange.description?.match(/min: ([0-9.]+)/i)?.[1]
    //   const max = exchange.description?.match(/max: ([0-9.]+)/i)?.[1]
    //   const message = [
    //     'Amount is out of range',
    //     min && `(min: ${min} ${fromAsset.symbol})`,
    //     max && `(max: ${max} ${fromAsset.symbol})`,
    //   ].join(' ')
    //   throw new Error(message)
    // }
    // verify that the created exchange has the same assets we are trying to swap
    if (
      exchange.deposit.network !== from.network ||
      exchange.deposit.symbol !== from.symbol ||
      exchange.withdrawal.network !== to.network ||
      exchange.withdrawal.symbol !== to.symbol
    )
      throw new Error("Incorrect currencies from provider. Please try again later")
    if (exchange.deposit.amount > amount.toNumber())
      throw new Error("Quote changed. Please try again.")
    if (exchange.withdrawal.address !== toAddress)
      throw new Error("Incorrect destination address from provider. Please try again later")

    return exchange
  } catch (cause) {
    // eslint-disable-next-line no-console
    console.error(new Error("Failed to create exchange", { cause }))
    throw cause
  }
})

const evmTransactionAtom = atom(async (get): Promise<TransactionRequest | undefined> => {
  try {
    const evmChainConnector = get(chainConnectorsAtom).evm
    if (!evmChainConnector) throw new Error("Missing evm chain connector")

    const fromAddress = get(fromAddressAtom)
    if (!fromAddress) throw new Error("Missing from address")
    const fromAsset = get(fromAssetAtom)
    if (!fromAsset) throw new Error("Missing from asset")
    const exchange = await get(exchangeAtom)
    if (!exchange) throw new Error("Missing exchange")

    if (fromAsset.networkType !== "evm") return

    const chain = Object.values(supportedEvmChains).find(
      (c) => c?.id.toString() === fromAsset.chainId.toString(),
    )
    if (!chain) throw new Error("Network not supported")

    const walletClient = (
      await evmChainConnector.getWalletClientForEvmNetwork(fromAsset.chainId.toString())
    )?.extend(publicActions)
    if (!walletClient) throw new Error("Missing evm client")

    const depositAmount = Decimal.fromUserInput(
      String(exchange.deposit.expected_amount),
      fromAsset.decimals,
    )

    if (!fromAsset.contractAddress)
      return walletClient.prepareTransactionRequest({
        chain,
        to: exchange.deposit.address as `0x${string}`,
        value: depositAmount.planck,
        account: fromAddress as `0x${string}`,
      })

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [exchange.deposit.address as `0x${string}`, depositAmount.planck],
    })
    return walletClient.prepareTransactionRequest({
      chain,
      to: fromAsset.contractAddress as `0x${string}`,
      data,
      value: 0n,
      account: fromAddress as `0x${string}`,
    })
  } catch (cause) {
    // eslint-disable-next-line no-console
    console.error(new Error("Failed to create evm transaction", { cause }))
    throw cause
  }
})

const substratePayloadAtom = (sapi?: ScaleApi | null, allowReap?: boolean) =>
  atom(async (get) => {
    try {
      if (!sapi) return null

      const fromAddress = get(fromAddressAtom)
      if (!fromAddress) throw new Error("Missing from address")
      const fromAsset = get(fromAssetAtom)
      if (!fromAsset) throw new Error("Missing from asset")
      const exchange = await get(exchangeAtom)
      if (!exchange) throw new Error("Missing exchange")

      if (fromAsset.networkType !== "substrate") return null

      const depositAmount = Decimal.fromUserInput(
        String(exchange.deposit.expected_amount),
        fromAsset.decimals,
      )

      const payload =
        fromAsset.assetHubAssetId !== undefined
          ? await sapi.getExtrinsicPayload(
              "Assets",
              allowReap ? "transfer" : "transfer_keep_alive",
              {
                id: fromAsset.assetHubAssetId,
                target: MultiAddress.Id(exchange.deposit.address),
                amount: depositAmount.planck,
              },
              { address: fromAddress },
            )
          : await sapi.getExtrinsicPayload(
              "Balances",
              allowReap ? "transfer_allow_death" : "transfer_keep_alive",
              { dest: MultiAddress.Id(exchange.deposit.address), value: depositAmount.planck },
              { address: fromAddress },
            )

      return payload
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.error(new Error("Failed to create substrate payload", { cause }))
      throw cause
    }
  })

const estimateGas: GetEstimateGasTxFunction = async (get) => {
  const fromAsset = get(fromAssetAtom)
  const fromAddress = get(fromAddressAtom)
  if (!fromAsset) return null
  if (!fromAddress) return null

  if (fromAsset.networkType === "evm") {
    if (!isEthereumAddress(fromAddress)) return null // invalid ethereum address
    const knownEvmNetworks = await get(
      atomWithObservable(() => getNetworksMapById$({ platform: "ethereum" })),
    )
    const network = knownEvmNetworks[fromAsset.chainId]
    const nativeToken = await get(atomWithObservable(() => getToken$(network?.nativeTokenId)))
    const evmChain = Object.values(supportedEvmChains).find(
      (c) => c?.id.toString() === fromAsset.chainId.toString(),
    )

    const data = fromAsset.contractAddress
      ? encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [fromAddress, 0n] })
      : undefined

    if (network && nativeToken && evmChain) {
      const client = await get(publicClientAtomFamily(network.id))
      if (!client) return null
      const gasPrice = await client.getGasPrice()
      // the to address and amount dont matter, we just need to place any address here for the estimation
      const gasLimit = await client.estimateGas({
        account: fromAddress as `0x${string}`,
        data,
        to: fromAsset.contractAddress ? (fromAsset.contractAddress as `0x${string}`) : fromAddress,
        value: 0n,
      })
      const amount = BigNumber(gasPrice.toString())
        .times(gasLimit.toString())
        .times(10 ** -(nativeToken.decimals ?? 0))
      return { name: "Est. Gas Fees", tokenId: nativeToken.id, amount }
    }

    return null
  }

  // cannot swap from BTC
  const swappingFromBtc = fromAsset.id === "btc-native"
  if (swappingFromBtc) return null

  // swapping from Polkadot
  const chains = await get(atomWithObservable(() => getNetworks$({ platform: "polkadot" })))
  const substrateChain = chains.find((c) => c.id === fromAsset.chainId)
  const polkadotApi = await get(apiPromiseAtom(substrateChain?.id))
  if (!polkadotApi) return null
  const fromAmount = get(fromAmountAtom)

  const transferTx =
    fromAsset.assetHubAssetId !== undefined
      ? (polkadotApi.tx.assets["transferAllowDeath"] ?? polkadotApi.tx.assets["transfer"])(
          fromAsset.assetHubAssetId,
          fromAddress,
          fromAmount.planck,
        )
      : (polkadotApi.tx.balances["transferAllowDeath"] ?? polkadotApi.tx.balances["transfer"])(
          fromAddress,
          fromAmount.planck,
        )
  const decimals = transferTx.registry.chainDecimals[0] ?? 10 // default to polkadot decimals 10
  const paymentInfo = await transferTx.paymentInfo(fromAddress)
  return {
    name: "Est. Gas Fees",
    tokenId: substrateChain?.nativeTokenId ?? subNativeTokenId("polkadot"),
    amount: BigNumber(paymentInfo.partialFee.toBigInt().toString()).times(10 ** -decimals),
  }
}

export const stealthexSwapModule: SwapModule = {
  protocol: PROTOCOL,
  fromAssetsSelector,
  toAssetsSelector,
  quote,
  exchangeAtom,
  evmTransactionAtom,
  substratePayloadAtom,
  decentralisationScore: DECENTRALISATION_SCORE,
}

export const swapStatus$ = (id: string): Observable<StealthexExchange["status"] | undefined> =>
  retryStatus$(id).pipe(
    switchMap((status) => {
      if (status === undefined) return of(undefined)

      const shouldRefresh = (status: StealthexExchange["status"] | undefined) =>
        !(status && ["finished", "failed", "expired", "refunded"].includes(status))

      // refresh every 20s if status isn't final
      if (shouldRefresh(status)) {
        return interval(20_000).pipe(
          startWith(-1),
          switchMap((i) => (i === -1 ? of(status) : retryStatus$(id))),
          takeWhile((status) => shouldRefresh(status), true),
        )
      }
      return of(status)
    }),
  )

const retryStatus$ = (id: string): Observable<StealthexExchange["status"] | undefined> =>
  defer(() => stealthexSdk.getExchange(id).then((exchange) => exchange.status)).pipe(
    // retry up to 10 times, wait 5s between each retry
    retry({ count: 10, delay: 5_000 }),

    // log when all retries failed, and return undefined
    catchError((error) => {
      // eslint-disable-next-line no-console
      console.error(`Failed to fetch exchange status for '${id}'`, error)
      return of(undefined)
    }),
  )
