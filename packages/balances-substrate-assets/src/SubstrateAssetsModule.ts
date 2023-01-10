import { Metadata, TypeRegistry, createType } from "@polkadot/types"
import { BN, bnToU8a } from "@polkadot/util"
import {
  AddressesByToken,
  Amount,
  Balance,
  BalanceModule,
  Balances,
  DefaultBalanceModule,
  NewBalanceType,
} from "@talismn/balances"
import {
  ChainId,
  NewTokenType,
  SubChainId,
  TokenList,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import { mutateMetadata } from "@talismn/mutate-metadata"
import { blake2Concat, decodeAnyAddress, hasOwnProperty } from "@talismn/util"

import log from "./log"

type ModuleType = "substrate-assets"

// Assets.Account is the state_storage key prefix for the assets pallet token balances
// Assets.Asset is the state_storage key prefix for the assets pallet token details (minBalance)
// Assets.Metadata is the state_storage key prefix for the assets pallet token metadata (name, symbol, decimals)
const moduleHash = "682a59d51ab9e48a8c8cc418ff9708d2" // xxhashAsHex("Assets", 128).replace(/^0x/, "")

const accountStorageHash = "b99d880ec681799c0cf30e8886371da9" // xxhashAsHex("Account", 128).replace(/^0x/, "")
const assetStorageHash = "d34371a193a751eea5883e9553457b2e" // xxhashAsHex("Asset", 128).replace(/^0x/, "")
const metadataStorageHash = "b5f3822e35ca2f31ce3526eab1363fd2" // xxhashAsHex("Metadata", 128).replace(/^0x/, "")

// e.g.
// {
//   balance: 2,000,000,000
//   isFrozen: false
//   reason: Sufficient
//   extra: null
// }
const moduleAccountStorageHash = `${moduleHash}${accountStorageHash}`
// e.g.
// {
//   owner: HKKT5DjFaUE339m7ZWS2yutjecbUpBcDQZHw2EF7SFqSFJH
//   issuer: HKKT5DjFaUE339m7ZWS2yutjecbUpBcDQZHw2EF7SFqSFJH
//   admin: HKKT5DjFaUE339m7ZWS2yutjecbUpBcDQZHw2EF7SFqSFJH
//   freezer: HKKT5DjFaUE339m7ZWS2yutjecbUpBcDQZHw2EF7SFqSFJH
//   supply: 99,996,117,733,044,042
//   deposit: 1,000,000,000,000
//   minBalance: 100,000
//   isSufficient: true
//   accounts: 6,032
//   sufficients: 1,542
//   approvals: 1
//   status: Live
// }
const moduleAssetStorageHash = `${moduleHash}${assetStorageHash}`
// e.g.
// {
//   deposit: 6,693,333,000
//   name: RMRK.app
//   symbol: RMRK
//   decimals: 10
//   isFrozen: false
// }
const moduleMetadataStorageHash = `${moduleHash}${metadataStorageHash}`

const subAssetTokenId = (chainId: ChainId, assetId: string, tokenSymbol: string) =>
  `${chainId}-substrate-assets-${assetId}-${tokenSymbol}`.toLowerCase()

export type SubAssetsToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    assetId: number
    isFrozen: boolean
    chain: { id: ChainId }
  }
>

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    SubAssetsToken: SubAssetsToken
  }
}

export type SubAssetsChainMeta = {
  isTestnet: boolean
  assetsAccountType: number | null
  assetsAssetType: number | null
  assetsMetadataType: number | null
  metadata: `0x${string}` | null
  metadataVersion: number
}

export type SubAssetsModuleConfig = {
  tokens?: Array<{
    assetId: number
    symbol?: string
    coingeckoId?: string
  }>
}

export type SubAssetsBalance = NewBalanceType<
  ModuleType,
  {
    multiChainId: SubChainId

    free: Amount
    locks: Amount
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    SubAssetsBalance: SubAssetsBalance
  }
}

export const SubAssetsModule: BalanceModule<
  ModuleType,
  SubAssetsToken,
  SubAssetsChainMeta,
  SubAssetsModuleConfig
> = {
  ...DefaultBalanceModule("substrate-assets"),

  async fetchSubstrateChainMeta(chainConnector, chaindataProvider, chainId) {
    const isTestnet = (await chaindataProvider.getChain(chainId))?.isTestnet || false

    const metadataRpc = await chainConnector.send(chainId, "state_getMetadata", [])

    const pjsMetadata: Metadata = new Metadata(new TypeRegistry(), metadataRpc)
    pjsMetadata.registry.setMetadata(pjsMetadata)

    let assetsAccountType = null
    let assetsAssetType = null
    let assetsMetadataType = null
    const balanceMetadata = await mutateMetadata(metadataRpc, (metadata) => {
      if (
        metadata.__kind === "V0" ||
        metadata.__kind === "V1" ||
        metadata.__kind === "V2" ||
        metadata.__kind === "V3" ||
        metadata.__kind === "V4" ||
        metadata.__kind === "V5" ||
        metadata.__kind === "V6" ||
        metadata.__kind === "V7" ||
        metadata.__kind === "V8" ||
        metadata.__kind === "V9" ||
        metadata.__kind === "V10" ||
        metadata.__kind === "V11" ||
        metadata.__kind === "V12" ||
        metadata.__kind === "V13"
      ) {
        // we can't parse metadata < v14
        return null
      }

      const isAssetsPallet = (pallet: any) => pallet.name === "Assets"
      const isAccountItem = (item: any) => item.name === "Account"
      const isAssetItem = (item: any) => item.name === "Asset"
      const isMetadataItem = (item: any) => item.name === "Metadata"

      metadata.value.pallets = metadata.value.pallets.filter(isAssetsPallet)

      const [accountItem, assetItem, metadataItem] = (() => {
        const systemPallet = metadata.value.pallets.find(isAssetsPallet)
        if (!systemPallet) return []
        if (!systemPallet.storage) return []

        const isAccountOrAssetOrMetadataItem = [isAccountItem, isAssetItem, isMetadataItem].reduce(
          (combinedFilter, filter) =>
            combinedFilter ? (item: any) => combinedFilter(item) || filter(item) : filter
        )

        systemPallet.events = undefined
        systemPallet.calls = undefined
        systemPallet.errors = undefined
        systemPallet.constants = []
        systemPallet.storage.items = systemPallet.storage.items.filter(
          isAccountOrAssetOrMetadataItem
        )

        return [
          (systemPallet.storage?.items || []).find(isAccountItem),
          (systemPallet.storage?.items || []).find(isAssetItem),
          (systemPallet.storage?.items || []).find(isMetadataItem),
        ]
      })()

      assetsAccountType = accountItem?.type.value
      assetsAssetType = assetItem?.type.value
      assetsMetadataType = metadataItem?.type.value

      // this is a set of type ids which we plan to keep in our mutated metadata
      // anything not in this set will be deleted
      // we start off with just the types of the state calls we plan to make,
      // then we run those types through a function (addDependentTypes) which will also include
      // all of the types which those types depend on - recursively
      const keepTypes = new Set(
        [assetsAccountType, assetsAssetType, assetsMetadataType].filter(
          (type): type is number => typeof type === "number"
        )
      )

      const addDependentTypes = (types: number[]) => {
        for (const typeIndex of types) {
          const type = metadata.value.lookup.types[typeIndex]
          if (!type) {
            log.warn(`Unable to find type with index ${typeIndex}`)
            continue
          }

          keepTypes.add(type.id)

          // TODO: Handle other types
          // (all chains so far are only using Composite for balances,
          // but later on for other use cases we'll need to at least also handle 'Variant' types)
          if (type?.type?.def?.__kind === "Composite") {
            addDependentTypes(type.type.def.value.fields.map(({ type }) => type))
          }
        }
      }

      // recursively find all the types which our keepTypes depend on and add them to the keepTypes set
      addDependentTypes([...keepTypes])

      // ditch the types we aren't keeping
      const isKeepType = (type: any) => keepTypes.has(type.id)
      metadata.value.lookup.types = metadata.value.lookup.types.filter(isKeepType)

      // ditch the chain's signedExtensions, we don't need them for balance lookups
      // and the polkadot.js TypeRegistry will complain when it can't find the types for them
      metadata.value.extrinsic.signedExtensions = []

      return metadata
    })

    return {
      isTestnet,
      assetsAccountType,
      assetsAssetType,
      assetsMetadataType,
      metadata: balanceMetadata,
      metadataVersion: pjsMetadata.version,
    }
  },

  async fetchSubstrateChainTokens(
    chainConnector,
    chaindataProvider,
    chainId,
    chainMeta,
    moduleConfig
  ) {
    const {
      isTestnet,
      assetsAccountType,
      assetsAssetType,
      assetsMetadataType,
      metadata,
      metadataVersion,
    } = chainMeta

    const tokens: Record<string, SubAssetsToken> = {}
    for (const tokenConfig of moduleConfig?.tokens || []) {
      try {
        const assetId = tokenConfig.assetId
        const assetIdBn = new BN(assetId)
        const assetIdHash = blake2Concat(bnToU8a(assetIdBn, { bitLength: 32 })).replace(/^0x/, "")

        const typeRegistry = new TypeRegistry()
        if (metadata !== null && metadataVersion >= 14)
          typeRegistry.setMetadata(new Metadata(typeRegistry, metadata))

        const assetsAssetTypeDef =
          assetsAssetType !== null && typeRegistry.metadata.lookup.getTypeDef(assetsAssetType).type
        const assetsMetadataTypeDef =
          assetsMetadataType !== null &&
          typeRegistry.metadata.lookup.getTypeDef(assetsMetadataType).type

        const [assetsAssetEncoded, assetsMetadataEncoded] = await Promise.all([
          chainConnector.send(chainId, "state_getStorage", [
            `0x${moduleAssetStorageHash}${assetIdHash}`,
          ]),
          chainConnector.send(chainId, "state_getStorage", [
            `0x${moduleMetadataStorageHash}${assetIdHash}`,
          ]),
        ])

        const assetsAsset = assetsAssetTypeDef
          ? typeRegistry.createType(assetsAssetTypeDef, assetsAssetEncoded)
          : undefined
        const assetsMetadata = assetsMetadataTypeDef
          ? typeRegistry.createType(assetsMetadataTypeDef, assetsMetadataEncoded)
          : undefined

        const existentialDeposit =
          (assetsAsset as any)?.minBalance?.toBigInt?.()?.toString?.() || "0"
        const symbol =
          tokenConfig.symbol || (assetsMetadata as any)?.symbol?.toHuman?.() || "Unknown"
        // const name = (assetsMetadata as any)?.name?.toHuman?.() || symbol
        const decimals = (assetsMetadata as any)?.decimals?.toNumber?.() || 0
        const isFrozen = (assetsMetadata as any)?.isFrozen?.toHuman?.() || false
        const coingeckoId =
          typeof tokenConfig.coingeckoId === "string" ? tokenConfig.coingeckoId : undefined

        const id = subAssetTokenId(chainId, assetId.toString(), symbol)
        const token: SubAssetsToken = {
          id,
          type: "substrate-assets",
          isTestnet,
          symbol,
          decimals,
          logo: githubTokenLogoUrl(id),
          coingeckoId,
          existentialDeposit,
          assetId,
          isFrozen,
          chain: { id: chainId },
        }

        tokens[token.id] = token
      } catch (error) {
        log.error(
          `Failed to build substrate-assets token ${tokenConfig.assetId} (${tokenConfig.symbol}) on ${chainId}`,
          error
        )
        continue
      }
    }

    return tokens
  },

  // TODO: Don't create empty subscriptions
  async subscribeBalances(chainConnectors, chaindataProvider, addressesByToken, callback) {
    const tokens = await chaindataProvider.tokens()

    const addressesByTokenGroupedByChain = groupAddressesByTokenByChain(addressesByToken, tokens)

    const subscriptions = Object.entries(addressesByTokenGroupedByChain)
      .map(async ([chainId, addressesByToken]) => {
        if (!chainConnectors.substrate)
          throw new Error(`This module requires a substrate chain connector`)

        const chain = await chaindataProvider.getChain(chainId)
        if (!chain) throw new Error(`Failed to get chain ${chainId}`)

        const tokensAndAddresses = Object.entries(addressesByToken)
          .map(([tokenId, addresses]) => [tokenId, tokens[tokenId], addresses] as const)
          .filter(([tokenId, token]) => {
            if (!token) {
              log.error(`Token ${tokenId} not found`)
              return false
            }

            // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
            if (token.type !== "substrate-assets") {
              log.debug(`This module doesn't handle tokens of type ${token.type}`)
              return false
            }

            return true
          })
          .map(([, token, addresses]): [SubAssetsToken, string[]] => [token, addresses])

        const typeRegistry = new TypeRegistry()
        const balanceMetadata = (chain.balanceMetadata || []).find(
          ({ moduleType }) => moduleType === "substrate-assets"
        )
        if (
          balanceMetadata?.metadata.metadata !== undefined &&
          balanceMetadata?.metadata.metadata !== null &&
          balanceMetadata?.metadata.metadataVersion >= 14
        )
          typeRegistry.setMetadata(new Metadata(typeRegistry, balanceMetadata.metadata.metadata))

        const assetsAccountTypeDef = typeRegistry.metadata.lookup.getTypeDef(
          balanceMetadata?.metadata.assetsAccountType
        )?.type

        // set up method, return message type and params
        const subscribeMethod = "state_subscribeStorage" // method we call to subscribe
        const responseMethod = "state_storage" // type of message we expect to receive for each subscription update
        const unsubscribeMethod = "state_unsubscribeStorage" // method we call to unsubscribe
        const params = buildParams(tokensAndAddresses)

        // build lookup table of `rpc hex output` -> `input address`
        const references = buildReferences(tokensAndAddresses)

        // set up subscription
        const unsubscribe = await chainConnectors.substrate.subscribe(
          chainId,
          subscribeMethod,
          unsubscribeMethod,
          responseMethod,
          params,
          (error, result) => {
            if (error) return callback(error)
            callback(
              null,
              formatRpcResult(
                chainId,
                tokens,
                assetsAccountTypeDef,
                typeRegistry,
                references,
                result
              )
            )
          }
        )

        return unsubscribe
      })
      .map((subscription) =>
        subscription.catch((error) => {
          log.warn(`Failed to create subscription: ${error.message}`)
          return () => {}
        })
      )

    return () => subscriptions.forEach((promise) => promise.then((unsubscribe) => unsubscribe()))
  },

  async fetchBalances(chainConnectors, chaindataProvider, addressesByToken) {
    const tokens = await chaindataProvider.tokens()

    const addressesByTokenGroupedByChain = groupAddressesByTokenByChain(addressesByToken, tokens)

    const balances = await Promise.all(
      Object.entries(addressesByTokenGroupedByChain).map(async ([chainId, addressesByToken]) => {
        if (!chainConnectors.substrate)
          throw new Error(`This module requires a substrate chain connector`)

        const chain = await chaindataProvider.getChain(chainId)
        if (!chain) throw new Error(`Failed to get chain ${chainId}`)

        const tokensAndAddresses = Object.entries(addressesByToken)
          .map(([tokenId, addresses]) => [tokenId, tokens[tokenId], addresses] as const)
          .filter(([tokenId, token]) => {
            if (!token) {
              log.error(`Token ${tokenId} not found`)
              return false
            }

            // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
            if (token.type !== "substrate-assets") {
              log.debug(`This module doesn't handle tokens of type ${token.type}`)
              return false
            }

            return true
          })
          .map(([, token, addresses]): [SubAssetsToken, string[]] => [token, addresses])

        const typeRegistry = new TypeRegistry()
        const balanceMetadata = (chain.balanceMetadata || []).find(
          ({ moduleType }) => moduleType === "substrate-assets"
        )
        if (
          balanceMetadata?.metadata.metadata !== undefined &&
          balanceMetadata?.metadata.metadata !== null &&
          balanceMetadata?.metadata.metadataVersion >= 14
        )
          typeRegistry.setMetadata(new Metadata(typeRegistry, balanceMetadata.metadata.metadata))

        const assetsAccountTypeDef = typeRegistry.metadata.lookup.getTypeDef(
          balanceMetadata?.metadata.assetsAccountType
        )?.type

        // set up method and params
        const method = "state_queryStorageAt" // method we call to fetch
        const params = buildParams(tokensAndAddresses)

        // build lookup table of `rpc hex output` -> `input address`
        const references = buildReferences(tokensAndAddresses)

        // query rpc
        const response = await chainConnectors.substrate.send(chainId, method, params)
        const result = response[0]

        return formatRpcResult(
          chainId,
          tokens,
          assetsAccountTypeDef,
          typeRegistry,
          references,
          result
        )
      })
    )

    return balances.reduce((allBalances, balances) => allBalances.add(balances), new Balances([]))
  },
}

function groupAddressesByTokenByChain(
  addressesByToken: AddressesByToken<SubAssetsToken>,
  tokens: TokenList
): Record<string, AddressesByToken<SubAssetsToken>> {
  return Object.entries(addressesByToken).reduce((byChain, [tokenId, addresses]) => {
    const token = tokens[tokenId]
    if (!token) {
      log.error(`Token ${tokenId} not found`)
      return byChain
    }

    const chainId = token.chain?.id
    if (!chainId) {
      log.error(`Token ${tokenId} has no chain`)
      return byChain
    }

    if (!byChain[chainId]) byChain[chainId] = {}
    byChain[chainId][tokenId] = addresses

    return byChain
  }, {} as Record<string, AddressesByToken<SubAssetsToken>>)
}

/**
 * Turns an array of addresses into the params argument expected by `state_subscribeStorage` / `state_getStorage` / `state_queryStorageAt`.
 *
 * @param addresses - The addresses to query.
 * @returns The params to be sent to the RPC.
 */
function buildParams(tokensAndAddresses: Array<[SubAssetsToken, string[]]>): string[][] {
  return [
    tokensAndAddresses
      .map(([token, addresses]): [string, string[]] => [
        blake2Concat(bnToU8a(new BN(token.assetId), { bitLength: 32 })).replace(/^0x/, ""),
        addresses,
      ])
      .flatMap(([tokenHash, addresses]) =>
        addresses
          .map((address) => decodeAnyAddress(address))
          .map((addressBytes) => blake2Concat(addressBytes).replace(/^0x/, ""))
          .map((addressHash) => `0x${moduleAccountStorageHash}${tokenHash}${addressHash}`)
      ),
  ]
}

/**
 * Turns an array of addresses into a lookup table of `[address, token, reference]`.
 *
 * This lookup table is used to associate each balance in the RPC response with
 * the account which has that balance.
 *
 * @param addresses - The addresses which will be queried.
 * @returns The lookup table.
 *
 * @example An example of a lookup table returned by this function.
 * ```ts
 * [
 *   [
 *     // The address encoded in ss58 format
 *     "5EHNsSHuWrNMYgx3bPhsRVLG77DX8sS8wZrnbtieJzbtSZr9",
 *     // The token stateKey
 *     "...",
 *     // The address encoded in hexadecimal format
 *     "6222bdf686960b8ee8aeda225d885575c2238f0403003983b392cde500aeb06c"
 *   ]
 * ]
 * ```
 */
function buildReferences(
  tokensAndAddresses: Array<[SubAssetsToken, string[]]>
): Array<[string, string, string]> {
  return tokensAndAddresses
    .map(([token, addresses]): [string, string, string[]] => [
      token.id,
      blake2Concat(bnToU8a(new BN(token.assetId), { bitLength: 32 })).replace(/^0x/, ""),
      addresses,
    ])
    .flatMap(([tokenId, tokenHash, addresses]) =>
      addresses
        .map((address): [string, Uint8Array] => [address, decodeAnyAddress(address)])
        .map(([address, addressBytes]): [string, string] => [
          address,
          blake2Concat(addressBytes).replace(/^0x/, ""),
        ])
        .map(([address, addressHash]): [string, string, string] => [
          address,
          tokenId,
          `0x${moduleAccountStorageHash}${tokenHash}${addressHash}`,
        ])
    )
}

// TODO: Make use of polkadot.js to encode/decode these state calls, while avoiding the use of
// its WsProvider and ApiPromise classes so that we don't pull down and parse the entire metadata
// blob for each chain.
/**
 * Formats an RPC result into an instance of `Balances`
 *
 * @param chain - The chain which this result came from.
 * @param references - A lookup table for linking each balance to an `Address`.
 *                            Can be built with `BalancesRpc.buildReferences`.
 * @param result - The result returned by the RPC.
 * @returns A formatted list of balances.
 */
function formatRpcResult(
  chainId: ChainId,
  tokens: TokenList,
  assetsAccountTypeDef: string | undefined,
  typeRegistry: TypeRegistry,
  references: Array<[string, string, string]>,
  result: unknown
): Balances {
  if (typeof result !== "object" || result === null) return new Balances([])
  if (!hasOwnProperty(result, "changes") || typeof result.changes !== "object")
    return new Balances([])
  if (!Array.isArray(result.changes)) return new Balances([])

  const balances = result.changes
    .map(([reference, change]: [unknown, unknown]): Balance | false => {
      if (typeof reference !== "string") {
        log.warn(`Received non-string reference in RPC result : ${reference}`)
        return false
      }

      if (typeof change !== "string" && change !== null) {
        log.warn(`Received non-string and non-null change in RPC result : ${reference} | ${change}`)
        return false
      }

      const [address, tokenId] = references.find(([, , hex]) => reference === hex) || []
      if (address === undefined || tokenId === undefined) {
        const search = reference
        const set = references.map(([, , reference]) => reference).join(",\n")
        log.error(`Failed to find address & tokenId:\n${search} in\n${set}`)
        return false
      }

      const token = tokens[tokenId]
      if (!token) {
        log.error(`Failed to find token for chain ${chainId} tokenId ${tokenId}`)
        return false
      }

      let balance: any
      try {
        if (assetsAccountTypeDef === undefined) throw new Error(`assetsAccountType is undefined`)
        balance = createType(typeRegistry, assetsAccountTypeDef, change)
      } catch (error) {
        log.warn(
          `Failed to create balance type for token ${tokenId} on chain ${chainId}: ${(
            error as any
          )?.toString()}`
        )
        return false
      }

      const free =
        token.isFrozen || balance.isFrozen.toHuman()
          ? BigInt("0").toString()
          : (balance.balance.toBigInt() || BigInt("0")).toString()
      const frozen = token.isFrozen
        ? (balance.balance.toBigInt() || BigInt("0")).toString()
        : BigInt("0").toString()

      return new Balance({
        source: "substrate-assets",

        status: "live",

        address,
        multiChainId: { subChainId: chainId },
        chainId,
        tokenId,

        free,
        locks: frozen,
      })
    })
    .filter((balance): balance is Balance => Boolean(balance))

  return new Balances(balances)
}
