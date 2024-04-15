import { TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { assert } from "@polkadot/util"
import { UnsignedTransaction, defineMethod } from "@substrate/txwrapper-core"
import {
  BalancesConfigTokenParams,
  ChainId,
  ChaindataProvider,
  NewTokenType,
  SubChainId,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import {
  compactMetadata,
  decodeMetadata,
  decodeScale,
  encodeMetadata,
  encodeStateKey,
} from "@talismn/scale"

import { DefaultBalanceModule, NewBalanceModule, NewTransferParamsType } from "../BalanceModule"
import log from "../log"
import { db as balancesDb } from "../TalismanBalancesDatabase"
import { AddressesByToken, Amount, Balance, Balances, NewBalanceType } from "../types"
import { RpcStateQuery, RpcStateQueryHelper, buildStorageCoders, getUniqueChainIds } from "./util"

type ModuleType = "substrate-tokens"

export const subTokensTokenId = (chainId: ChainId, tokenSymbol: string) =>
  `${chainId}-substrate-tokens-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

const getChainIdFromTokenId = (tokenId: string) => {
  const match = /^([\d\w-]+)-substrate-tokens/.exec(tokenId)
  if (!match?.[1]) throw new Error(`Can't detect chainId for token ${tokenId}`)
  return match?.[1]
}

export type SubTokensToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    onChainId: string | number
    chain: { id: ChainId }
  }
>

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    SubTokensToken: SubTokensToken
  }
}

export type SubTokensChainMeta = {
  isTestnet: boolean
  miniMetadata?: string
  metadataVersion?: number
}

export type SubTokensModuleConfig = {
  tokens?: Array<
    {
      symbol?: string
      decimals?: number
      ed?: string
      onChainId?: string | number
    } & BalancesConfigTokenParams
  >
}

export type SubTokensBalance = NewBalanceType<
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
    SubTokensBalance: SubTokensBalance
  }
}

export type SubTokensTransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  metadataRpc: `0x${string}`
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  transferMethod: "transfer" | "transferKeepAlive" | "transferAll"
  userExtensions?: ExtDef
}>

export const SubTokensModule: NewBalanceModule<
  ModuleType,
  SubTokensToken,
  SubTokensChainMeta,
  SubTokensModuleConfig,
  SubTokensTransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")

  return {
    ...DefaultBalanceModule("substrate-tokens"),

    async fetchSubstrateChainMeta(chainId, moduleConfig, metadataRpc) {
      const isTestnet = (await chaindataProvider.chainById(chainId))?.isTestnet || false
      if (metadataRpc === undefined) return { isTestnet }
      if ((moduleConfig?.tokens ?? []).length < 1) return { isTestnet }

      const { metadataVersion, metadata, tag } = decodeMetadata(metadataRpc)
      if (!metadata) return { isTestnet }

      compactMetadata(metadata, [{ pallet: "Tokens", items: ["Accounts"] }])

      const miniMetadata = encodeMetadata(tag === "v15" ? { tag, metadata } : { tag, metadata })

      return { isTestnet, miniMetadata, metadataVersion }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      const { isTestnet } = chainMeta

      const tokens: Record<string, SubTokensToken> = {}
      for (const tokenConfig of moduleConfig?.tokens ?? []) {
        try {
          const symbol = tokenConfig?.symbol ?? "Unit"
          const decimals = tokenConfig?.decimals ?? 0
          const existentialDeposit = tokenConfig?.ed ?? "0"
          const onChainId = tokenConfig?.onChainId ?? undefined

          if (onChainId === undefined) continue

          const id = subTokensTokenId(chainId, symbol)
          const token: SubTokensToken = {
            id,
            type: "substrate-tokens",
            isTestnet,
            isDefault: tokenConfig.isDefault ?? true,
            symbol,
            decimals,
            logo: tokenConfig?.logo || githubTokenLogoUrl(id),
            existentialDeposit,
            onChainId,
            chain: { id: chainId },
          }

          if (tokenConfig?.symbol) token.symbol = tokenConfig?.symbol
          if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
          if (tokenConfig?.dcentName) token.dcentName = tokenConfig?.dcentName
          if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

          tokens[token.id] = token
        } catch (error) {
          log.error(
            `Failed to build substrate-tokens token ${tokenConfig.onChainId} (${tokenConfig.symbol}) on ${chainId}`,
            (error as Error)?.message ?? error
          )
          continue
        }
      }

      return tokens
    },

    getPlaceholderBalance(tokenId, address): SubTokensBalance {
      const chainId = getChainIdFromTokenId(tokenId)

      return {
        source: "substrate-tokens",
        status: "initializing",
        address,
        multiChainId: { subChainId: chainId },
        chainId,
        tokenId,
        free: "0",
        locks: "0",
        reserves: "0",
      }
    },

    // TODO: Don't create empty subscriptions
    async subscribeBalances(addressesByToken, callback) {
      const queries = await buildQueries(chaindataProvider, addressesByToken)
      const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
        (error, result) => (error ? callback(error) : callback(null, new Balances(result ?? [])))
      )

      return unsubscribe
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const queries = await buildQueries(chaindataProvider, addressesByToken)
      const result = await new RpcStateQueryHelper(chainConnectors.substrate, queries).fetch()

      return new Balances(result ?? [])
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
      userExtensions,
    }) {
      const token = await chaindataProvider.tokenById(tokenId)
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-tokens")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.chainById(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const { genesisHash } = chain

      const currencyId = (() => {
        try {
          // `as string` doesn't matter here because we catch it if it throws
          return JSON.parse(token.onChainId as string)
        } catch (error) {
          return token.onChainId
        }
      })()

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
            { metadataRpc, registry, userExtensions }
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
            { metadataRpc, registry, userExtensions }
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

async function buildQueries(
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<SubTokensToken>
): Promise<Array<RpcStateQuery<Balance>>> {
  const chains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()
  const miniMetadatas = new Map(
    (await balancesDb.miniMetadatas.toArray()).map((miniMetadata) => [
      miniMetadata.id,
      miniMetadata,
    ])
  )

  const uniqueChainIds = getUniqueChainIds(addressesByToken, tokens)
  const chainStorageCoders = buildStorageCoders({
    chainIds: uniqueChainIds,
    chains,
    miniMetadatas,
    moduleType: "substrate-tokens",
    coders: { storage: ["Tokens", "Accounts"] },
  })

  return Object.entries(addressesByToken).flatMap(([tokenId, addresses]) => {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      return []
    }
    if (token.type !== "substrate-tokens") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      return []
    }
    const chainId = token.chain?.id
    if (!chainId) {
      log.warn(`Token ${tokenId} has no chain`)
      return []
    }
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      return []
    }

    return addresses.flatMap((address): RpcStateQuery<Balance> | [] => {
      const scaleCoder = chainStorageCoders.get(chainId)?.storage
      const tokenOnChainId = (() => {
        try {
          // `as string` doesn't matter here because we catch it if it throws
          return JSON.parse(token.onChainId as string)
        } catch (error) {
          return token.onChainId
        }
      })()

      const stateKey = encodeStateKey(
        scaleCoder,
        `Invalid address / token onChainId in ${chainId} storage query ${address} / ${JSON.stringify(
          tokenOnChainId
        )}`,
        address,
        assetIdToEnum(tokenOnChainId)
      )
      if (!stateKey) return []

      const decodeResult = (change: string | null) => {
        /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
        type DecodedType = {
          free?: bigint
          reserved?: bigint
          frozen?: bigint
        }

        const decoded = decodeScale<DecodedType>(
          scaleCoder,
          change,
          `Failed to decode substrate-tokens balance on chain ${chainId}`
        ) ?? { free: 0n, reserved: 0n, frozen: 0n }

        const free = (decoded?.free ?? 0n).toString()
        const reserved = (decoded?.reserved ?? 0n).toString()
        const frozen = (decoded?.frozen ?? 0n).toString()

        return new Balance({
          source: "substrate-tokens",

          status: "live",

          address,
          multiChainId: { subChainId: chainId },
          chainId,
          tokenId: token.id,

          free,
          reserves: reserved,
          locks: frozen,
        })
      }

      return { chainId, stateKey, decodeResult }
    })
  })
}

// TODO: See if this can be upstreamed / is actually necessary.
// There might be a better way to construct enums with polkadot-api.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const assetIdToEnum = (assetId: any): any => {
  if (typeof assetId !== "object" && typeof assetId !== "string") return assetId

  const keys = typeof assetId === "object" ? Object.keys(assetId) : [assetId]
  if (keys.length !== 1) return assetId

  const key = keys[0]
  return {
    type: key,
    value: typeof assetId === "object" ? assetIdToEnum(assetId[key]) : undefined,
  }
}
