import { Metadata, TypeRegistry, createType } from "@polkadot/types"
import type { Registry } from "@polkadot/types-codec/types"
import { assert } from "@polkadot/util"
import { UnsignedTransaction, defineMethod } from "@substrate/txwrapper-core"
import {
  AddressesByToken,
  Amount,
  Balance,
  Balances,
  DefaultBalanceModule,
  NewBalanceModule,
  NewBalanceType,
  NewTransferParamsType,
  createTypeRegistryCache,
} from "@talismn/balances"
import {
  ChainId,
  NewTokenType,
  SubChainId,
  TokenList,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import { blake2Concat, decodeAnyAddress, hasOwnProperty, twox64Concat } from "@talismn/util"

import log from "./log"

type ModuleType = "substrate-orml"

// Tokens.Account is the state_storage key prefix for orml tokens
const moduleHash = "99971b5749ac43e0235e41b0d3786918" // xxhashAsHex("Tokens", 128).replace(/^0x/, "")
const storageHash = "8ee7418a6531173d60d1f6a82d8f4d51" // xxhashAsHex("Accounts", 128).replace(/^0x/, "")
const moduleStorageHash = `${moduleHash}${storageHash}`

const AccountData = JSON.stringify({ free: "u128", reserved: "u128", frozen: "u128" })

const subOrmlTokenId = (chainId: ChainId, tokenSymbol: string) =>
  `${chainId}-substrate-orml-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

export type SubOrmlToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    stateKey: `0x${string}`
    chain: { id: ChainId }
  }
>

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    SubOrmlToken: SubOrmlToken
  }
}

export type SubOrmlChainMeta = {
  isTestnet: boolean
  symbols: string[]
  decimals: number[]
  stateKeys: Record<string, `0x${string}`>
}

export type SubOrmlModuleConfig = {
  disable?: boolean
}

export type SubOrmlBalance = NewBalanceType<
  ModuleType,
  {
    multiChainId: SubChainId

    free: Amount
    reserves: Amount
    locks: Amount
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    SubOrmlBalance: SubOrmlBalance
  }
}

export type SubOrmlTransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  metadataRpc: `0x${string}`
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  transferMethod: "transfer" | "transferKeepAlive" | "transferAll"
}>

export const SubOrmlModule: NewBalanceModule<
  ModuleType,
  SubOrmlToken,
  SubOrmlChainMeta,
  SubOrmlModuleConfig,
  SubOrmlTransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")

  const { getOrCreateTypeRegistry } = createTypeRegistryCache()

  return {
    ...DefaultBalanceModule("substrate-orml"),

    async fetchSubstrateChainMeta(chainId, moduleConfig) {
      const isTestnet = (await chaindataProvider.getChain(chainId))?.isTestnet || false

      if (moduleConfig?.disable === true)
        return { isTestnet, symbols: [], decimals: [], stateKeys: {} }

      const [metadataRpc, chainProperties] = await Promise.all([
        chainConnector.send(chainId, "state_getMetadata", []),
        chainConnector.send(chainId, "system_properties", []),
      ])

      const { tokenSymbol, tokenDecimals } = chainProperties

      const symbols: string[] = Array.isArray(tokenSymbol) ? tokenSymbol : []
      const decimals: number[] = Array.isArray(tokenDecimals) ? tokenDecimals : []

      const metadata: Metadata = new Metadata(new TypeRegistry(), metadataRpc)
      metadata.registry.setMetadata(metadata)

      const currencyIdDef = (metadata.asLatest.lookup?.types || []).find(
        ({ type }) => type.path.slice(-1).toString() === "CurrencyId" && type?.def?.isVariant
      )
      const currencyIdVariants = (currencyIdDef?.type?.def?.asVariant?.variants.toJSON() ||
        []) as Array<{
        name: string
        index: number
      }>
      const currencyIdLookup = Object.fromEntries(
        currencyIdVariants.map(({ name, index }) => [name, index])
      )
      const tokensCurrencyIdIndex = currencyIdLookup["Token"]

      const tokenSymbolDef = (metadata.asLatest.lookup?.types || []).find(
        ({ type }) => type.path.slice(-1).toString() === "TokenSymbol"
      )
      const tokenSymbolVariants = (tokenSymbolDef?.type?.def?.asVariant?.variants.toJSON() ||
        []) as Array<{
        name: string
        index: number
      }>
      const tokenStateKeyLookup = Object.fromEntries(
        tokenSymbolVariants
          .map(
            ({ name, index }) =>
              [name, new Uint8Array([tokensCurrencyIdIndex || 0, index])] as const
          )
          .map(([name, stateKey]) => [name, twox64Concat(stateKey)])
      )

      const stateKeys = tokenStateKeyLookup

      return {
        isTestnet,
        symbols,
        decimals,
        stateKeys,
      }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      if (moduleConfig?.disable === true) return {}

      const { isTestnet, symbols, decimals, stateKeys } = chainMeta

      const tokens: Record<string, SubOrmlToken> = {}
      for (const index in symbols) {
        const symbol = symbols[index]
        const stateKey = stateKeys[symbol]
        if (stateKey === undefined) continue

        const id = subOrmlTokenId(chainId, symbol)
        const token: SubOrmlToken = {
          id,
          type: "substrate-orml",
          isTestnet,
          symbol,
          decimals: decimals[index],
          logo: githubTokenLogoUrl(id),
          // TODO: Fetch the ED
          existentialDeposit: "0",
          stateKey,
          chain: { id: chainId },
        }

        tokens[token.id] = token
      }

      return tokens
    },

    // TODO: Don't create empty subscriptions
    async subscribeBalances(addressesByToken, callback) {
      const tokens = await chaindataProvider.tokens()

      const addressesByTokenGroupedByChain = groupAddressesByTokenByChain(addressesByToken, tokens)

      const subscriptions = Object.entries(addressesByTokenGroupedByChain)
        .map(async ([chainId, addressesByToken]) => {
          if (!chainConnectors.substrate)
            throw new Error(`This module requires a substrate chain connector`)

          const tokensAndAddresses = Object.entries(addressesByToken)
            .map(([tokenId, addresses]) => [tokenId, tokens[tokenId], addresses] as const)
            .filter(([tokenId, token]) => {
              if (!token) {
                log.error(`Token ${tokenId} not found`)
                return false
              }

              // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
              if (token.type !== "substrate-orml") {
                log.debug(`This module doesn't handle tokens of type ${token.type}`)
                return false
              }

              const stateKey = token.stateKey
              if (!stateKey) {
                log.error(`Token ${token.id} has no stateKey`)
                return false
              }

              return true
            })
            .map(([, token, addresses]): [SubOrmlToken, string[]] => [
              token as SubOrmlToken,
              addresses,
            ])

          const typeRegistry = getOrCreateTypeRegistry(chainId, "0x00")

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
              callback(null, formatRpcResult(chainId, tokens, typeRegistry, references, result))
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

    async fetchBalances(addressesByToken) {
      const tokens = await chaindataProvider.tokens()

      const addressesByTokenGroupedByChain = groupAddressesByTokenByChain(addressesByToken, tokens)

      const balances = await Promise.all(
        Object.entries(addressesByTokenGroupedByChain).map(async ([chainId, addressesByToken]) => {
          if (!chainConnectors.substrate)
            throw new Error(`This module requires a substrate chain connector`)

          const tokensAndAddresses = Object.entries(addressesByToken)
            .map(([tokenId, addresses]) => [tokenId, tokens[tokenId], addresses] as const)
            .filter(([tokenId, token]) => {
              if (!token) {
                log.error(`Token ${tokenId} not found`)
                return false
              }

              // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
              if (token.type !== "substrate-orml") {
                log.debug(`This module doesn't handle tokens of type ${token.type}`)
                return false
              }

              const stateKey = token.stateKey
              if (!stateKey) {
                log.error(`Token ${token.id} has no stateKey`)
                return false
              }

              return true
            })
            .map(([, token, addresses]): [SubOrmlToken, string[]] => [
              token as SubOrmlToken,
              addresses,
            ])

          const typeRegistry = getOrCreateTypeRegistry(chainId, "0x00")

          // set up method and params
          const method = "state_queryStorageAt" // method we call to fetch
          const params = buildParams(tokensAndAddresses)

          // build lookup table of `rpc hex output` -> `input address`
          const references = buildReferences(tokensAndAddresses)

          // query rpc
          const response = await chainConnectors.substrate.send(chainId, method, params)
          const result = response[0]

          return formatRpcResult(chainId, tokens, typeRegistry, references, result)
        })
      )

      return balances.reduce((allBalances, balances) => allBalances.add(balances), new Balances([]))
    },

    async transferToken({
      tokenId,
      from,
      to,
      amount,

      registry,
      metadataRpc,
      blockHash,
      blockNumber,
      nonce,
      specVersion,
      transactionVersion,
      tip,
      transferMethod,
    }) {
      const token = await chaindataProvider.getToken(tokenId)
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-orml")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.getChain(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const { genesisHash } = chain

      const currencyId = { Token: token.symbol.toUpperCase() }

      // different chains use different orml transfer methods
      // we'll try each one in sequence until we get one that doesn't throw an error
      let unsigned: UnsignedTransaction | undefined = undefined
      const errors: Error[] = []

      const currenciesPallet = "currencies"
      const currenciesMethod = "transfer"
      const currenciesArgs = { dest: to, currencyId, amount }

      const sendAll = transferMethod === "transferAll"

      const tokensPallet = "tokens"
      const tokensMethod = transferMethod
      const tokensArgs = sendAll
        ? { dest: to, currencyId, keepAlive: false }
        : { dest: to, currencyId, amount }

      const commonDefineMethodFields = {
        address: from,
        blockHash,
        blockNumber,
        eraPeriod: 64,
        genesisHash,
        metadataRpc,
        nonce,
        specVersion,
        tip: tip ? Number(tip) : 0,
        transactionVersion,
      }

      const unsignedMethods = [
        () =>
          defineMethod(
            {
              method: {
                pallet: currenciesPallet,
                name: currenciesMethod,
                args: currenciesArgs,
              },
              ...commonDefineMethodFields,
            },
            { metadataRpc, registry }
          ),
        () =>
          defineMethod(
            {
              method: {
                pallet: tokensPallet,
                name: tokensMethod,
                args: tokensArgs,
              },
              ...commonDefineMethodFields,
            },
            { metadataRpc, registry }
          ),
      ]

      for (const method of unsignedMethods) {
        try {
          unsigned = method()
        } catch (error: unknown) {
          errors.push(error as Error)
        }
      }

      if (unsigned === undefined) {
        errors.forEach((error) => log.error(error))
        throw new Error(`${token.symbol} transfers are not supported at this time.`)
      }

      return { type: "substrate", tx: unsigned }
    },
  }
}

function groupAddressesByTokenByChain(
  addressesByToken: AddressesByToken<SubOrmlToken>,
  tokens: TokenList
): Record<string, AddressesByToken<SubOrmlToken>> {
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
  }, {} as Record<string, AddressesByToken<SubOrmlToken>>)
}

/**
 * Turns an array of addresses into the params argument expected by `state_subscribeStorage` / `state_getStorage` / `state_queryStorageAt`.
 *
 * @param addresses - The addresses to query.
 * @returns The params to be sent to the RPC.
 */
function buildParams(tokensAndAddresses: Array<[SubOrmlToken, string[]]>): string[][] {
  return [
    tokensAndAddresses
      .map(([token, addresses]): [string, string[]] => [
        token.stateKey.replace(/^0x/, ""),
        addresses,
      ])
      .flatMap(([tokenHash, addresses]) =>
        addresses
          .map((address) => decodeAnyAddress(address))
          .map((addressBytes) => blake2Concat(addressBytes).replace(/^0x/, ""))
          .map((addressHash) => `0x${moduleStorageHash}${addressHash}${tokenHash}`)
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
  tokensAndAddresses: Array<[SubOrmlToken, string[]]>
): Array<[string, string, string]> {
  return tokensAndAddresses
    .map(([token, addresses]): [string, string, string[]] => [
      token.id,
      token.stateKey.replace(/^0x/, ""),
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
          `0x${moduleStorageHash}${addressHash}${tokenHash}`,
        ])
    )
}

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
  typeRegistry: Registry,
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

      const balance: any = createType(typeRegistry, AccountData, change)

      const free = (balance.free.toBigInt() || BigInt("0")).toString()
      const reserved = (balance.reserved.toBigInt() || BigInt("0")).toString()
      const frozen = (balance.frozen.toBigInt() || BigInt("0")).toString()

      return new Balance({
        source: "substrate-orml",

        status: "live",

        address,
        multiChainId: { subChainId: chainId },
        chainId,
        tokenId,

        free,
        reserves: reserved,
        locks: frozen,
      })
    })
    .filter((balance): balance is Balance => Boolean(balance))

  return new Balances(balances)
}
