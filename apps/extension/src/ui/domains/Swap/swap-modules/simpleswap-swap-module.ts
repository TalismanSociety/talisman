import type { Chain as ViemChain } from "viem/chains"
import { MultiAddress } from "@polkadot-api/descriptors"
import {
  chainConnectorsAtom,
  evmErc20TokenId,
  evmNativeTokenId,
  subAssetTokenId,
  subNativeTokenId,
} from "@talismn/balances-react"
import { encodeAnyAddress, isAddressEqual, isEthereumAddress } from "@talismn/crypto"
import { ScaleApi } from "@talismn/sapi"
import BigNumber from "bignumber.js"
import { remoteConfigStore } from "extension-core"
import { UNKNOWN_TOKEN_URL } from "extension-shared"
import { atom, ExtractAtomValue } from "jotai"
import { atomWithObservable, loadable } from "jotai/utils"
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
  blast,
  bsc,
  mainnet,
  manta,
  moonbeam,
  moonriver,
  opBNB,
  optimism,
  polygon,
  sonic,
  zksync,
} from "viem/chains"

import { accounts$, getNetworks$, getNetworksMapById$, getToken$, getTokensMap$ } from "@ui/state"

import type { QuoteFee, QuoteResponse, SupportedSwapProtocol } from "./common.swap-module.ts"
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
  SwapModule,
  SwappableAssetBaseType,
  SwappableAssetWithDecimals,
  swapQuoteRefresherAtom,
  toAddressAtom,
  toAssetAtom,
  validateAddress,
} from "./common.swap-module"
import simpleswapLogo from "./simpleswap-logo.svg?url"

export const PROTOCOL: SupportedSwapProtocol = "simpleswap"
export const PROTOCOL_NAME = "SimpleSwap"
const DECENTRALISATION_SCORE = 1
const TALISMAN_FEE = 0.015
const TALISMAN_FEE_DISCOUNTED = 0.004

type RouteProps = { currencyFrom: string; currencyTo: string }
const discountedRoute = async ({ currencyFrom, currencyTo }: RouteProps) => {
  const { simpleswapDiscountedCurrencies: discounted = [] } = await remoteConfigStore.get("swaps")
  return discounted.includes(currencyFrom) || discounted.includes(currencyTo)
}
const getTalismanFee = async (route: RouteProps) =>
  (await discountedRoute(route)) ? TALISMAN_FEE_DISCOUNTED : TALISMAN_FEE
const getApiKey = async (route: RouteProps) =>
  (await discountedRoute(route))
    ? (await remoteConfigStore.get("swaps")).simpleswapApiKeyDiscounted
    : (await remoteConfigStore.get("swaps")).simpleswapApiKey

const LOGO = simpleswapLogo

type SimpleSwapCurrency = {
  name: string
  network: string
  symbol: string
  precision: number | null
  contract_address: string | null
  extra_id: string
  has_extra_id: boolean
  address_explorer: string
  confirmations_from: string
  image: string
  isFiat: boolean
}

type SimpleSwapAssetContext = {
  symbol: string
}

const supportedEvmChains: Record<string, ViemChain | undefined> = {
  arbitrum,
  arbnova: arbitrumNova,
  base,
  blast,
  bsc,
  eth: mainnet,
  glmr: moonbeam,
  manta,
  matic: polygon,
  movr: moonriver,
  opbnb: opBNB,
  optimism,
  polygon,
  s: sonic,
  vana: vanaMainnet,
  zksync,
}

/**
 * specialAssets list defines a mappings of assets from simpleswap
 * to our internal asset representation. Many assets on simpleswap are not tradeable
 * in an onchain context because they dont come with contract addresses.
 * To avoid displaying a token which we dont have contract address for (which could result in a bunch of issues like, not being able to display the token balance, not being able to transfer the token for swapping and etc),
 * We support mainly 2 types of assets:
 * - ERC20 tokens: we only support ERC20 tokens from Simpleswap that comes with contract addresses
 * - Special assets: all substrate and evm native assets from simpleswap are whitelisted as special assets
 */
const specialAssets: Record<string, Omit<SwappableAssetBaseType, "context">> = {
  dot: {
    id: subNativeTokenId("polkadot-asset-hub"),
    name: "Polkadot Asset Hub",
    symbol: "DOT",
    chainId: "polkadot-asset-hub",
    networkType: "substrate",
  },
  ksmassethub: {
    id: subNativeTokenId("kusama-asset-hub"),
    name: "Kusama Asset Hub",
    symbol: "KSM",
    chainId: "kusama-asset-hub",
    networkType: "substrate",
  },
  usdtdot: {
    id: subAssetTokenId("polkadot-asset-hub", "1984"),
    name: "USDT (Polkadot)",
    chainId: "polkadot-asset-hub",
    symbol: "USDT",
    networkType: "substrate",
    assetHubAssetId: "1984",
  },
  usdcdot: {
    id: subAssetTokenId("polkadot-asset-hub", "1337"),
    name: "USDC (Polkadot)",
    chainId: "polkadot-asset-hub",
    symbol: "USDC",
    networkType: "substrate",
    assetHubAssetId: "1337",
  },
  eth: {
    id: evmNativeTokenId("1"),
    name: "Ethereum",
    chainId: 1,
    symbol: "ETH",
    networkType: "evm",
  },
  etharb: {
    id: evmNativeTokenId("42161"),
    name: "Ethereum",
    chainId: 42161,
    symbol: "ETH",
    networkType: "evm",
  },
  ethop: {
    id: evmNativeTokenId("10"),
    name: "Ethereum",
    chainId: 10,
    symbol: "ETH",
    networkType: "evm",
  },
  s: {
    id: evmNativeTokenId("146"),
    name: "Sonic",
    chainId: 146,
    symbol: "S",
    networkType: "evm",
  },
  vana: {
    id: evmNativeTokenId("1480"),
    name: "Vana",
    chainId: 1480,
    symbol: "VANA",
    networkType: "evm",
  },
  ethmanta: {
    id: evmNativeTokenId("169"),
    name: "Ethereum (Manta Pacific)",
    chainId: 169,
    symbol: "ETH",
    networkType: "evm",
  },
  manta: {
    id: evmErc20TokenId("169", "0x95cef13441be50d20ca4558cc0a27b601ac544e5"),
    name: "Manta Network",
    chainId: 169,
    symbol: "MANTA",
    networkType: "evm",
    contractAddress: "0x95cef13441be50d20ca4558cc0a27b601ac544e5",
  },
  tao: {
    id: subNativeTokenId("bittensor"),
    name: "Bittensor",
    chainId: "bittensor",
    symbol: "TAO",
    networkType: "substrate",
  },
  anlog: {
    id: subNativeTokenId("analog-timechain"),
    name: "Analog",
    chainId: "analog-timechain",
    symbol: "ANLOG",
    networkType: "substrate",
  },
  btc: {
    id: "btc-native",
    name: "Bitcoin",
    chainId: "bitcoin",
    symbol: "BTC",
    networkType: "btc",
  },
  /** SS expects substrate address when swapping ASTR */
  astr: {
    id: subNativeTokenId("astar"),
    name: "Astar",
    symbol: "ASTR",
    chainId: "astar",
    networkType: "substrate",
  },
  azero: {
    id: subNativeTokenId("aleph-zero"),
    name: "Aleph Zero",
    symbol: "AZERO",
    chainId: "aleph-zero",
    networkType: "substrate",
  },
  /** SS expects substrate address when swapping ACA */
  aca: {
    id: subNativeTokenId("acala"),
    name: "ACALA",
    symbol: "ACA",
    chainId: "acala",
    networkType: "substrate",
  },
  /** SS expects EVM address when swapping GLMR */
  glmr: {
    id: evmNativeTokenId("1284"),
    name: "Moonbeam",
    symbol: "GLMR",
    chainId: "moonbeam",
    networkType: "evm",
  },
  /** SS expects EVM address when swapping MOVR */
  movr: {
    id: evmNativeTokenId("1285"),
    name: "Moonriver",
    symbol: "MOVR",
    chainId: "moonriver",
    networkType: "evm",
  },
  avail: {
    id: subNativeTokenId("avail"),
    name: "Avail",
    symbol: "AVAIL",
    chainId: "avail",
    networkType: "substrate",
  },
}

type Exchange = {
  id: string
  type: string
  timestamp: string
  updated_at: string
  valid_until: null
  currency_from: string
  currency_to: string
  amount_from: string
  expected_amount: string
  amount_to: string
  address_from: string
  address_to: string
  user_refund_address: string | null
  tx_from: null
  tx_to: null
  status: "waiting" | "confirming" | "exchanging" | "sending" | "finished" | "failed"
  redirect_url: null
  currencies: Record<
    string,
    {
      name: string
      symbol: string
      network: string
      image: string
      warnings_from: string[]
      warnings_to: string[]
      validation_address: string
      address_explorer: string
      tx_explorer: string
      confirmations_from: string
      contract_address: string | null
      isFiat: boolean
    }
  >
  trace_id: string
  code?: number
  description?: string
  error?: string
}

type Range = { min: BigNumber }

const simpleSwapSdk = {
  getAllCurrencies: async (): Promise<SimpleSwapCurrency[]> => {
    const { simpleswapApiKey } = await remoteConfigStore.get("swaps")
    const allCurrenciesRes = await fetch(
      `https://api.simpleswap.io/get_all_currencies?api_key=${simpleswapApiKey}`,
    )
    return await allCurrenciesRes.json()
  },
  getEstimate: async (props: {
    currencyFrom: string
    currencyTo: string
    amount: string
    fixed: boolean
  }): Promise<
    string | { code: number; error: string; description: string; trace_id: string } | null
  > => {
    try {
      const api_key = await getApiKey(props)
      if (!api_key) throw new Error("Simpleswap api key not found")
      const search = new URLSearchParams({
        api_key,
        fixed: `${props.fixed}`,
        currency_from: props.currencyFrom,
        currency_to: props.currencyTo,
        amount: props.amount,
      })
      const allCurrenciesRes = await fetch(
        `https://api.simpleswap.io/get_estimated?${search.toString()}`,
      )
      return await allCurrenciesRes.json()
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.error(new Error("Failed to fetch all simpleswap currencies", { cause }))
      return null
    }
  },
  getPairs: async (props: {
    symbol: string
    fixed: boolean
  }): Promise<
    string[] | { code: number; error: string; description: string; trace_id: string } | null
  > => {
    try {
      const { simpleswapApiKey } = await remoteConfigStore.get("swaps")
      if (!simpleswapApiKey) throw new Error("Simpleswap api key not found")
      const search = new URLSearchParams({
        api_key: simpleswapApiKey,
        fixed: `${props.fixed}`,
        symbol: props.symbol,
      })
      const allPairs = await fetch(`https://api.simpleswap.io/get_pairs?${search.toString()}`)
      return await allPairs.json()
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.error(new Error("Failed to fetch simpleswap pairs", { cause }))
      return null
    }
  },
  createExchange: async (props: {
    fixed: boolean
    currency_from: string
    currency_to: string
    amount: number
    address_to: string
    extra_id_to?: string
    user_refund_address: string | null
    user_refund_extra_id: string | null
  }): Promise<Exchange> => {
    const api_key = await getApiKey({
      currencyFrom: props.currency_from,
      currencyTo: props.currency_to,
    })
    if (!api_key) throw new Error("Simpleswap api key not found")
    const search = new URLSearchParams({ api_key: api_key })
    const exchange = await fetch(`https://api.simpleswap.io/create_exchange?${search.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(props),
    })

    return exchange.json()
  },
  getExchange: async (id: string): Promise<Exchange> => {
    const { simpleswapApiKey } = await remoteConfigStore.get("swaps")
    if (!simpleswapApiKey) throw new Error("Simpleswap api key not found")
    const search = new URLSearchParams({ api_key: simpleswapApiKey, id })
    const exchange = await fetch(`https://api.simpleswap.io/get_exchange?${search.toString()}`)
    return exchange.json()
  },
  getRange: async (props: {
    currency_from: string
    currency_to: string
  }): Promise<Range | undefined> => {
    const api_key = await getApiKey({
      currencyFrom: props.currency_from,
      currencyTo: props.currency_to,
    })
    if (!api_key) throw new Error("Simpleswap api key not found")
    const search = new URLSearchParams({
      api_key,
      fixed: "false",
      ...props,
    })
    const json:
      | { min?: string; trace_id?: string }
      | { code?: number; error?: string; description?: string; trace_id?: string } = await (
      await fetch(`https://api.simpleswap.io/get_ranges?${search.toString()}`)
    ).json()

    if ("error" in json) throw new Error(json.error)
    if (!("min" in json)) return

    if (typeof json.min !== "string") return

    return { min: BigNumber(json.min) }
  },
}

const simpleswapAssetsAtom = atom(async (get) => {
  const allCurrencies = await simpleSwapSdk.getAllCurrencies()

  const supportedTokens = allCurrencies.filter((currency) => {
    if (currency.isFiat) return false
    const isEvmNetwork = supportedEvmChains[currency.network as keyof typeof supportedEvmChains]
    const isSpecialAsset = specialAssets[currency.symbol]

    // evm assets must be whitelisted as a special asset or have a contract address
    if (isEvmNetwork) return isSpecialAsset || !!currency.contract_address

    // substrate assets must be whitelisted as a special asset
    return isSpecialAsset
  })
  const knownTokens = await get(atomWithObservable(() => getTokensMap$()))

  return Object.values(
    supportedTokens.reduce(
      (acc, currency) => {
        const evmChain = supportedEvmChains[currency.network as keyof typeof supportedEvmChains]
        const polkadotAsset = specialAssets[currency.symbol]

        const id = evmChain
          ? getTokenIdForSwappableAsset(
              "evm",
              evmChain.id,
              currency.contract_address ? currency.contract_address : undefined,
            )
          : polkadotAsset?.id
        const chainId = evmChain ? evmChain.id : polkadotAsset?.chainId
        if (!id || !chainId) return acc

        const image =
          (knownTokens[id]?.logo !== UNKNOWN_TOKEN_URL ? knownTokens[id]?.logo : undefined) ??
          currency.image
        const asset: SwappableAssetBaseType<{ simpleswap: SimpleSwapAssetContext }> = {
          id,
          name: polkadotAsset?.name ?? currency.name,
          symbol: polkadotAsset?.symbol ?? currency.symbol,
          decimals:
            polkadotAsset?.decimals ??
            evmChain?.nativeCurrency?.decimals ??
            currency.precision ??
            undefined,
          chainId,
          contractAddress: currency.contract_address ? currency.contract_address : undefined,
          image,
          networkType: evmChain ? "evm" : (polkadotAsset?.networkType ?? "substrate"),
          assetHubAssetId: polkadotAsset?.assetHubAssetId,
          context: {
            simpleswap: {
              symbol: currency.symbol,
            },
          },
        }
        return { ...acc, [id]: asset }
      },
      {} as Record<string, SwappableAssetBaseType<{ simpleswap: SimpleSwapAssetContext }>>,
    ),
  )
})

const pairKeyFromPair = (pair: Awaited<ExtractAtomValue<typeof pairsAtom>>[number]) =>
  pair.toLowerCase()
const pairKeyFromAsset = (asset: SwappableAssetBaseType) =>
  asset.context.simpleswap?.symbol.toLowerCase()

const pairsAtom = atom(async (get) => {
  const fromAsset = get(fromAssetAtom)
  const { symbol } = fromAsset?.context?.simpleswap ?? {}
  if (!symbol) return [] // not supported

  const pairs = await simpleSwapSdk.getPairs({ symbol, fixed: false })
  if (!pairs || !Array.isArray(pairs)) return []

  return pairs
})

const fromAssetsSelector = atom(async (get) => await get(simpleswapAssetsAtom))
const toAssetsSelector = atom(async (get) => {
  const allAssets = await get(simpleswapAssetsAtom)
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

    if (!fromAsset || !toAsset || !fromAmount || fromAmount.planck === 0n) return null
    const currencyFrom = fromAsset.context.simpleswap?.symbol
    const currencyTo = toAsset.context.simpleswap?.symbol
    if (!currencyFrom || !currencyTo) return null

    // force refresh
    get(swapQuoteRefresherAtom)

    const range = await simpleSwapSdk.getRange({
      currency_from: currencyFrom,
      currency_to: currencyTo,
    })
    if (range && range.min.isGreaterThan(fromAmount.toString()))
      throw new Error(`SimpleSwap minimum is ${range.min.toString()} ${fromAsset.symbol}`)

    const output = await simpleSwapSdk.getEstimate({
      amount: fromAmount.toString(),
      currencyFrom,
      currencyTo,
      fixed: false,
    })
    const talismanFee = await getTalismanFee({ currencyFrom, currencyTo })

    // check for error object
    if (!output || typeof output !== "string") {
      if (output && typeof output !== "string") {
        return {
          decentralisationScore: DECENTRALISATION_SCORE,
          protocol: PROTOCOL,
          inputAmountBN: fromAmount.planck,
          outputAmountBN: 0n,
          error: output.description,
          timeInSec: 5 * 60,
          fees: [],
          providerLogo: LOGO,
          providerName: PROTOCOL_NAME,
          talismanFee,
        }
      }
      return null
    }

    const gasFee = await estimateGas(get)
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
      outputAmountBN: Decimal.fromUserInput(output, toAsset.decimals).planck,
      // swaps take about 5mins according to their faq: https://simpleswap.io/faq#crypto-to-crypto-exchanges--how-long-does-it-take-to-exchange-coins
      timeInSec: 5 * 60,
      fees,
      providerLogo: LOGO,
      providerName: PROTOCOL_NAME,
      talismanFee,
    }
  }),
)
export const saveIdForMonitoring = async (swapId: string, txHash: string) => {
  await fetch(`https://swap-providers-monitor.fly.dev/simpleswap/exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: swapId, deposit_tx_hash: txHash }),
  })
}

export type SimpleswapExchange = Exchange
const exchangeAtom = atom(async (get): Promise<Exchange | undefined> => {
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

    const currency_from = fromAsset.context?.simpleswap?.symbol as string
    const currency_to = toAsset.context?.simpleswap?.symbol as string
    if (!currency_from) throw new Error("Missing currency from")
    if (!currency_to) throw new Error("Missing currency to")

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

    const exchange = await simpleSwapSdk.createExchange({
      fixed: false,
      address_to: toAddress,
      amount: amount.toNumber(),
      currency_from,
      currency_to,
      extra_id_to: "",
      user_refund_address: null,
      user_refund_extra_id: null,
    })
    if (!exchange) throw new Error("Error creating exchange")

    if (exchange.code === 422) {
      const min = exchange.description?.match(/min: ([0-9.]+)/i)?.[1]
      const max = exchange.description?.match(/max: ([0-9.]+)/i)?.[1]
      const message = [
        "Amount is out of range",
        min && `(min: ${min} ${fromAsset.symbol})`,
        max && `(max: ${max} ${fromAsset.symbol})`,
      ].join(" ")
      throw new Error(message)
    }
    // verify that the created exchange has the same assets we are trying to swap
    if (exchange.currency_from !== currency_from || exchange.currency_to !== currency_to) {
      // eslint-disable-next-line no-console
      console.trace(
        "exchange.currency_from",
        exchange.currency_from,
        "currency_from",
        currency_from,
        "exchange.currency_to",
        exchange.currency_to,
        "currency_to",
        currency_to,
      )
      throw new Error("Incorrect currencies from provider. Please try again later")
    }
    if (+exchange.expected_amount > amount.toNumber())
      throw new Error("Quote changed. Please try again.")
    if (exchange.address_to !== toAddress)
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

    const depositAmount = Decimal.fromUserInput(exchange.expected_amount, fromAsset.decimals)

    if (!fromAsset.contractAddress)
      return walletClient.prepareTransactionRequest({
        chain,
        to: exchange.address_from as `0x${string}`,
        value: depositAmount.planck,
        account: fromAddress as `0x${string}`,
      })

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [exchange.address_from as `0x${string}`, depositAmount.planck],
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

      const depositAmount = Decimal.fromUserInput(exchange.expected_amount, fromAsset.decimals)

      const payload =
        fromAsset.assetHubAssetId !== undefined
          ? await sapi.getExtrinsicPayload(
              "Assets",
              allowReap ? "transfer" : "transfer_keep_alive",
              {
                id: fromAsset.assetHubAssetId,
                target: MultiAddress.Id(exchange.address_from),
                amount: depositAmount.planck,
              },
              { address: fromAddress },
            )
          : await sapi.getExtrinsicPayload(
              "Balances",
              allowReap ? "transfer_allow_death" : "transfer_keep_alive",
              { dest: MultiAddress.Id(exchange.address_from), value: depositAmount.planck },
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

export const simpleswapSwapModule: SwapModule = {
  protocol: PROTOCOL,
  fromAssetsSelector,
  toAssetsSelector,
  quote,
  exchangeAtom,
  evmTransactionAtom,
  substratePayloadAtom,
  decentralisationScore: DECENTRALISATION_SCORE,
}

export const swapStatus$ = (id: string): Observable<Exchange["status"] | undefined> =>
  retryStatus$(id).pipe(
    switchMap((status) => {
      if (status === undefined) return of(undefined)

      const shouldRefresh = (status: Exchange["status"] | undefined) =>
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

const retryStatus$ = (id: string): Observable<Exchange["status"] | undefined> =>
  defer(() => simpleSwapSdk.getExchange(id).then((exchange) => exchange.status)).pipe(
    // retry up to 10 times, wait 5s between each retry
    retry({ count: 10, delay: 5_000 }),

    // log when all retries failed, and return undefined
    catchError((error) => {
      // eslint-disable-next-line no-console
      console.error(`Failed to fetch exchange status for '${id}'`, error)
      return of(undefined)
    }),
  )
