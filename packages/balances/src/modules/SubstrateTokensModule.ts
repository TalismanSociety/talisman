import { mergeUint8, toHex } from "@polkadot-api/utils"
import { TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { assert } from "@polkadot/util"
import {
  BalancesConfigTokenParams,
  ChaindataProvider,
  ChainId,
  githubTokenLogoUrl,
  Token,
} from "@talismn/chaindata-provider"
import {
  compactMetadata,
  decodeMetadata,
  decodeScale,
  encodeMetadata,
  encodeStateKey,
  getDynamicBuilder,
  getLookupFn,
  papiParse,
} from "@talismn/scale"
import { Binary } from "polkadot-api"

import { DefaultBalanceModule, NewBalanceModule, NewTransferParamsType } from "../BalanceModule"
import log from "../log"
import { db as balancesDb } from "../TalismanBalancesDatabase"
import { AddressesByToken, AmountWithLabel, Balances, NewBalanceType } from "../types"
import { buildStorageCoders, getUniqueChainIds, RpcStateQuery, RpcStateQueryHelper } from "./util"

type ModuleType = "substrate-tokens"
const moduleType: ModuleType = "substrate-tokens"

export type SubTokensToken = Extract<Token, { type: ModuleType }>

export const subTokensTokenId = (chainId: ChainId, tokenSymbol: string) =>
  `${chainId}-substrate-tokens-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

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

export type SubTokensBalance = NewBalanceType<ModuleType, "complex", "substrate">

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "substrate-tokens": SubTokensBalance
  }
}

export type SubTokensTransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
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
    ...DefaultBalanceModule(moduleType),

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

          if (tokenConfig?.symbol) {
            token.symbol = tokenConfig?.symbol
            token.id = subTokensTokenId(chainId, token.symbol)
          }
          if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
          if (tokenConfig?.dcentName) token.dcentName = tokenConfig?.dcentName
          if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

          tokens[token.id] = token
        } catch (error) {
          log.error(
            `Failed to build substrate-tokens token ${tokenConfig.onChainId} (${tokenConfig.symbol}) on ${chainId}`,
            (error as Error)?.message ?? error,
          )
          continue
        }
      }

      return tokens
    },

    // TODO: Don't create empty subscriptions
    async subscribeBalances({ addressesByToken }, callback) {
      const queries = await buildQueries(chaindataProvider, addressesByToken)
      const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
        (error, result) => {
          if (error) return callback(error)
          const balances = result?.filter((b): b is SubTokensBalance => b !== null) ?? []
          if (balances.length > 0) callback(null, new Balances(balances))
        },
      )

      return unsubscribe
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const queries = await buildQueries(chaindataProvider, addressesByToken)
      const result = await new RpcStateQueryHelper(chainConnectors.substrate, queries).fetch()
      const balances = result?.filter((b): b is SubTokensBalance => b !== null) ?? []
      return new Balances(balances)
    },

    async transferToken({ tokenId, to, amount, transferMethod, metadataRpc }) {
      const token = await chaindataProvider.tokenById(tokenId)
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-tokens")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.chainById(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const onChainId = (() => {
        try {
          return papiParse(token.onChainId)
        } catch (error) {
          return token.onChainId
        }
      })()

      const { metadata } = decodeMetadata(metadataRpc)
      if (metadata === undefined) throw new Error("Unable to decode metadata")

      const scaleBuilder = getDynamicBuilder(getLookupFn(metadata))

      const tryBuildCallData = (
        pallet: string,
        method: string,
        args: unknown,
      ): [Binary, undefined] | [undefined, Error] => {
        try {
          const { location, codec } = scaleBuilder.buildCall(pallet, method)
          return [
            Binary.fromBytes(mergeUint8(new Uint8Array(location), codec.enc(args))),
            undefined,
          ]
        } catch (cause) {
          return [undefined, new Error("Failed to build call", { cause })]
        }
      }

      const sendAll = transferMethod === "transfer_all"

      // different chains use different transfer types
      // we'll try each one in sequence until we get one that doesn't throw an error
      const attempts = [
        {
          pallet: "Currencies",
          method: "transfer",
          args: {
            dest: { type: "Id", value: to },
            currency_id: onChainId,
            amount: BigInt(amount),
          },
        },
        {
          pallet: "Currencies",
          method: "transfer",
          args: {
            dest: to,
            currency_id: onChainId,
            amount: BigInt(amount),
          },
        },
        {
          pallet: "Tokens",
          method: transferMethod,
          args: sendAll
            ? {
                dest: { type: "Id", value: to },
                currency_id: onChainId,
                keepAlive: false,
              }
            : {
                dest: { type: "Id", value: to },
                currency_id: onChainId,
                amount: BigInt(amount),
              },
        },
        {
          pallet: "Tokens",
          method: transferMethod,
          args: sendAll
            ? {
                dest: to,
                currency_id: onChainId,
                keepAlive: false,
              }
            : {
                dest: to,
                currency_id: onChainId,
                amount: BigInt(amount),
              },
        },
      ]

      const errors: Error[] = []
      let callData: Binary | undefined = undefined
      for (const attempt of attempts) {
        const [_callData, error] = tryBuildCallData(attempt.pallet, attempt.method, attempt.args)
        if (error) {
          errors.push(error)
          continue
        }
        callData = _callData
        break
      }

      if (callData === undefined) {
        errors.forEach((error) => log.error(error))
        throw new Error(`${token.symbol} transfers are not supported at this time.`)
      }

      return { type: "substrate", callData: toHex(callData.asBytes()) }
    },
  }
}

async function buildQueries(
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<SubTokensToken>,
): Promise<Array<RpcStateQuery<SubTokensBalance | null>>> {
  const allChains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()
  const miniMetadatas = new Map(
    (await balancesDb.miniMetadatas.toArray()).map((miniMetadata) => [
      miniMetadata.id,
      miniMetadata,
    ]),
  )

  const uniqueChainIds = getUniqueChainIds(addressesByToken, tokens)
  const chains = Object.fromEntries(uniqueChainIds.map((chainId) => [chainId, allChains[chainId]]))
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

    return addresses.flatMap((address): RpcStateQuery<SubTokensBalance | null> | [] => {
      const scaleCoder = chainStorageCoders.get(chainId)?.storage
      const onChainId = (() => {
        try {
          return papiParse(token.onChainId)
        } catch (error) {
          return token.onChainId
        }
      })()

      const stateKey = encodeStateKey(
        scaleCoder,
        `Invalid address / token onChainId in ${chainId} storage query ${address} / ${token.onChainId}`,
        address,
        onChainId,
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
          `Failed to decode substrate-tokens balance on chain ${chainId}`,
        ) ?? { free: 0n, reserved: 0n, frozen: 0n }

        const free = (decoded?.free ?? 0n).toString()
        const reserved = (decoded?.reserved ?? 0n).toString()
        const frozen = (decoded?.frozen ?? 0n).toString()

        const balanceValues: Array<AmountWithLabel<string>> = [
          { type: "free", label: "free", amount: free.toString() },
          { type: "reserved", label: "reserved", amount: reserved.toString() },
          { type: "locked", label: "frozen", amount: frozen.toString() },
        ]

        return {
          source: "substrate-tokens",
          status: "live",
          address,
          multiChainId: { subChainId: chainId },
          chainId,
          tokenId: token.id,
          values: balanceValues,
        } as SubTokensBalance
      }

      return { chainId, stateKey, decodeResult }
    })
  })
}
