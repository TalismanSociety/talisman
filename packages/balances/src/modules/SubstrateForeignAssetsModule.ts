import { TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { assert } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
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
} from "@talismn/scale"
import { Binary, Enum } from "polkadot-api"

import { DefaultBalanceModule, NewBalanceModule, NewTransferParamsType } from "../BalanceModule"
import log from "../log"
import { db as balancesDb } from "../TalismanBalancesDatabase"
import { AddressesByToken, AmountWithLabel, Balances, NewBalanceType } from "../types"
import { buildStorageCoders, getUniqueChainIds, RpcStateQuery, RpcStateQueryHelper } from "./util"

type ModuleType = "substrate-foreignassets"
const moduleType: ModuleType = "substrate-foreignassets"

export type SubForeignAssetsToken = Extract<Token, { type: ModuleType }>

export const subForeignAssetTokenId = (chainId: ChainId, tokenSymbol: string) =>
  `${chainId}-substrate-foreignassets-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

export type SubForeignAssetsChainMeta = {
  isTestnet: boolean
  miniMetadata?: string
  metadataVersion?: number
}

export type SubForeignAssetsModuleConfig = {
  tokens?: Array<
    {
      onChainId: string
    } & BalancesConfigTokenParams
  >
}

export type SubForeignAssetsBalance = NewBalanceType<ModuleType, "complex", "substrate">

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "substrate-foreignassets": SubForeignAssetsBalance
  }
}

export type SubForeignAssetsTransferParams = NewTransferParamsType<{
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

export const SubForeignAssetsModule: NewBalanceModule<
  ModuleType,
  SubForeignAssetsToken,
  SubForeignAssetsChainMeta,
  SubForeignAssetsModuleConfig,
  SubForeignAssetsTransferParams
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

      compactMetadata(metadata, [
        { pallet: "ForeignAssets", items: ["Account", "Asset", "Metadata"] },
      ])

      const miniMetadata = encodeMetadata(tag === "v15" ? { tag, metadata } : { tag, metadata })

      return { isTestnet, miniMetadata, metadataVersion }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      if ((moduleConfig?.tokens ?? []).length < 1) return {}

      const { isTestnet, miniMetadata, metadataVersion } = chainMeta
      if (miniMetadata === undefined || metadataVersion === undefined) return {}
      if (metadataVersion < 14) return {}

      const { metadata } = decodeMetadata(miniMetadata)
      if (metadata === undefined) return {}

      const scaleBuilder = getDynamicBuilder(metadata)
      const assetCoder = scaleBuilder.buildStorage("Assets", "Asset")
      const metadataCoder = scaleBuilder.buildStorage("Assets", "Metadata")

      const tokens: Record<string, SubForeignAssetsToken> = {}
      for (const tokenConfig of moduleConfig?.tokens ?? []) {
        try {
          const onChainId = (() => {
            try {
              return JSON.parse(tokenConfig.onChainId)
            } catch (error) {
              return tokenConfig.onChainId
            }
          })()

          if (onChainId === undefined) continue

          const parsedOnChainId = parseOnChainId(chainId, onChainId)

          const assetStateKey = tryEncode(assetCoder, parsedOnChainId)
          const metadataStateKey = tryEncode(metadataCoder, parsedOnChainId)

          if (assetStateKey === null || metadataStateKey === null)
            throw new Error(
              `Failed to encode stateKey for foreign token ${onChainId} on chain ${chainId}`
            )

          type AssetResult = {
            accounts?: number
            admin?: string
            approvals?: number
            deposit?: bigint
            freezer?: string
            is_sufficient?: boolean
            issuer?: string
            min_balance?: bigint
            owner?: string
            status?: unknown
            sufficients?: number
            supply?: bigint
          }
          type MetadataResult = {
            decimals?: number
            deposit?: bigint
            is_frozen?: boolean
            name?: Binary
            symbol?: Binary
          }

          const [assetsAsset, assetsMetadata] = await Promise.all([
            chainConnector
              .send(chainId, "state_getStorage", [assetStateKey])
              .then((result) => (assetCoder.dec(result) as AssetResult | undefined) ?? null),
            chainConnector
              .send(chainId, "state_getStorage", [metadataStateKey])
              .then((result) => (metadataCoder.dec(result) as MetadataResult | undefined) ?? null),
          ])

          const existentialDeposit = assetsAsset?.min_balance?.toString?.() ?? "0"
          const symbol = assetsMetadata?.symbol?.asText?.() ?? "Unit"
          const decimals = assetsMetadata?.decimals ?? 0
          const isFrozen = assetsMetadata?.is_frozen ?? false

          const id = subForeignAssetTokenId(chainId, symbol)
          const token: SubForeignAssetsToken = {
            id,
            type: "substrate-foreignassets",
            isTestnet,
            isDefault: tokenConfig?.isDefault ?? true,
            symbol,
            decimals,
            logo: tokenConfig?.logo || githubTokenLogoUrl(id),
            existentialDeposit,
            onChainId: tokenConfig.onChainId,
            isFrozen,
            chain: { id: chainId },
          }

          if (tokenConfig?.symbol) {
            token.symbol = tokenConfig?.symbol
            token.id = subForeignAssetTokenId(chainId, token.symbol)
          }
          if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
          if (tokenConfig?.dcentName) token.dcentName = tokenConfig?.dcentName
          if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

          tokens[token.id] = token
        } catch (error) {
          log.error(
            `Failed to build substrate-foreignassets token ${tokenConfig.onChainId} (${tokenConfig.symbol}) on ${chainId}`,
            error
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
          const balances = result?.filter((b): b is SubForeignAssetsBalance => b !== null) ?? []
          if (balances.length > 0) callback(null, new Balances(balances))
        }
      )

      return unsubscribe
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const queries = await buildQueries(chaindataProvider, addressesByToken)
      const result = await new RpcStateQueryHelper(chainConnectors.substrate, queries).fetch()
      const balances = result?.filter((b): b is SubForeignAssetsBalance => b !== null) ?? []
      return new Balances(balances)
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

      if (token.type !== "substrate-foreignassets")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.chainById(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const { genesisHash } = chain

      const id = (() => {
        try {
          return JSON.parse(token.onChainId)
        } catch (error) {
          return token.onChainId
        }
      })()

      const pallet = "foreignAssets"
      const method =
        // the foreignAssets pallet has no transferAll method
        transferMethod === "transferAll" ? "transfer" : transferMethod
      const args = { id, target: { Id: to }, amount }

      const unsigned = defineMethod(
        {
          method: {
            pallet,
            name: method,
            args,
          },
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
        },
        { metadataRpc, registry, userExtensions }
      )

      return { type: "substrate", tx: unsigned }
    },
  }
}

async function buildQueries(
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<SubForeignAssetsToken>
): Promise<Array<RpcStateQuery<SubForeignAssetsBalance | null>>> {
  const allChains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()
  const miniMetadatas = new Map(
    (await balancesDb.miniMetadatas.toArray()).map((miniMetadata) => [
      miniMetadata.id,
      miniMetadata,
    ])
  )

  const uniqueChainIds = getUniqueChainIds(addressesByToken, tokens)
  const chains = Object.fromEntries(uniqueChainIds.map((chainId) => [chainId, allChains[chainId]]))
  const chainStorageCoders = buildStorageCoders({
    chainIds: uniqueChainIds,
    chains,
    miniMetadatas,
    moduleType: "substrate-foreignassets",
    coders: { storage: ["ForeignAssets", "Account"] },
  })

  return Object.entries(addressesByToken).flatMap(([tokenId, addresses]) => {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      return []
    }
    if (token.type !== "substrate-foreignassets") {
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

    return addresses.flatMap((address): RpcStateQuery<SubForeignAssetsBalance | null> | [] => {
      const scaleCoder = chainStorageCoders.get(chainId)?.storage
      const onChainId = (() => {
        try {
          // `as string` doesn't matter here because we catch it if it throws
          return JSON.parse(token.onChainId as string)
        } catch (error) {
          return token.onChainId
        }
      })()
      const parsedOnChainId = parseOnChainId(chainId, onChainId)

      const stateKey = encodeStateKey(
        scaleCoder,
        `Invalid address / token onChainId in ${chainId} storage query ${address} / ${token.onChainId}\n` +
          `onChainId parsed as: '${JSON.stringify(parsedOnChainId)}'`,
        address,
        onChainId
      )
      if (!stateKey) return []

      const decodeResult = (change: string | null) => {
        /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
        type DecodedType = {
          balance?: bigint
          is_frozen?: boolean
          reason?: { type?: "Sufficient" }
          status?: { type?: "Liquid" } | { type?: "Frozen" }
          extra?: undefined
        }

        const decoded = decodeScale<DecodedType>(
          scaleCoder,
          change,
          `Failed to decode substrate-foreignassets balance on chain ${chainId}`
        ) ?? {
          balance: 0n,
          is_frozen: false,
          reason: { type: "Sufficient" },
          status: { type: "Liquid" },
          extra: undefined,
        }

        const isFrozen = decoded?.status?.type === "Frozen"
        const amount = (decoded?.balance ?? 0n).toString()

        // due to the following balance calculations, which are made in the `Balance` type:
        //
        // total balance        = (free balance) + (reserved balance)
        // transferable balance = (free balance) - (frozen balance)
        //
        // when `isFrozen` is true we need to set **both** the `free` and `frozen` amounts
        // of this balance to the value we received from the RPC.
        //
        // if we only set the `frozen` amount, then the `total` calculation will be incorrect!
        const free = amount
        const frozen = token.isFrozen || isFrozen ? amount : "0"

        // include balance values even if zero, so that newly-zero values overwrite old values
        const balanceValues: Array<AmountWithLabel<string>> = [
          { type: "free", label: "free", amount: free.toString() },
          { type: "locked", label: "frozen", amount: frozen.toString() },
        ]

        return {
          source: "substrate-foreignassets",

          status: "live",

          address,
          multiChainId: { subChainId: chainId },
          chainId,
          tokenId: token.id,
          values: balanceValues,
        } as SubForeignAssetsBalance
      }

      return { chainId, stateKey, decodeResult }
    })
  })
}

// TODO: Dedupe with SubstrateTokensModule parseOnChainId
// TODO: See if this can be upstreamed / is actually necessary.
// There might be a better way to construct enums with polkadot-api.
//
/**
 * For the substrate-tokens module, we configure the `onChainId` field in chaindata to tell the module how to query each token.
 * These queries are made to the tokens pallet.
 * E.g. api.query.Tokens.Account(accountAddress, parseOnChainId(JSON.parse(onChainId)))
 *
 * The `onChainId` field on chaindata must be a JSON-parseable string, but for some SCALE types (especially the Enum type) we must
 * use specific `polkadot-api` classes to handle SCALE-encoding the statekey.
 *
 * Some examples:
 * Input: `5`
 * Output: `5`
 *
 * Input: `{ DexShare: [{ Token: "ACA" }, { Token: "AUSD" }] }`
 * Output: `Enum("DexShare", [Enum("Token", Enum("ACA")), Enum("Token", Enum("AUSD"))])`
 *
 * Input: `{ LiquidCrowdloan: 13 }`
 * Output: `Enum("LiquidCrowdloan", 13)`
 *
 * Input: `{ Erc20: "0x07df96d1341a7d16ba1ad431e2c847d978bc2bce" }`
 * Output: `Enum("Erc20", Binary.fromHex("0x07df96d1341a7d16ba1ad431e2c847d978bc2bce"))`
 */
const parseOnChainId = (chainId: string, onChainId: unknown, recurse = false): unknown => {
  // haven't seen this used by any chains before,
  // but it's technically possible for `null` to slip through the following `typeof onChainId === 'object'` checks,
  // so we handle it explicitly here: return is as-is
  if (onChainId === null) return onChainId

  // numbers should not be modified
  // TODO: Handle int/bigint differentiation
  if (typeof onChainId === "number") return onChainId

  // arrays, objects (enums) and strings (binary strings, as well as enums with an undefined value) need to be handled
  // everything else should not be modified
  if (typeof onChainId !== "object" && typeof onChainId !== "string") {
    console.log(chainId, "OTHER!", onChainId)
    return onChainId
  }

  // for arrays, pass each array item through this function
  if (Array.isArray(onChainId)) {
    console.log(chainId, "ARRAY!", onChainId)
    const res = onChainId.map((item) => parseOnChainId(chainId, item, true))
    console.log(chainId, "RESULT!ARRAY!", res)
    return res
  }

  // for hexadecimal strings, parse as hex into the Binary type
  if (typeof onChainId === "string" && onChainId.startsWith("0x")) {
    console.log(chainId, "HEX!", onChainId)
    return Binary.fromHex(onChainId)
  }

  // For any values which haven't already been handled by the previous if statements,
  // we are now going to consider them as an Enum.
  //
  // There are two forms of enums; ones *with* a value and ones *without* a value.
  //
  // Some examples of enums *without* a value:
  // { AUSD: undefined }
  // "AUSD"
  // { ACA: undefined }
  // "ACA"
  //
  // Some examples of enums *with* a value:
  // { Erc20: "0x00......" } // an enum containing a binary string
  // { ForeignAsset: 2 } // an enum containing a number
  // { DexShare: [{ Token: "ACA" }, { Erc20: "0x00......" }] } // an enum containing an array of enums
  //
  // Some examples of enums with a value, where the value is another enum:
  // { Token: "AUSD" }
  // { Token: { AUSD: undefined } }
  // { Token: "ACA" }
  // { Token: { ACA: undefined } }
  //
  // NOTE: In the last example,
  //   `{ Token: { AUSD: undefined } }`
  // is the preferred, unambiguous form of specifing an enum within an enum.
  // However,
  //   `{ Token: "AUSD" }`
  // is also supported, in order to maintain backwards compatibility with the PJS codebase
  // (which is what we had prior to migrating to scale-ts for statekey encoding).
  //
  // In the future, we might need to drop support for the ambiguous `{ Token: "AUSD" }` form of expressing an enum within an enum,
  // as well as the ambiguous `"AUSD"` form,
  // because it may prevent us from defining a hypothetical enum which contains a non-hexadecimal string.
  // For example, if we needed to support:
  //   `{ Token: "This is just a string" }`
  // to be parsed as
  //   `Enum("Token", "a string, not an enum")` // an arbitrary string within an enum
  // instead of how we currently parse it, which is
  //   `Enum("Token", Enum("a string, not an enum"))` // an enum within an enum
  //
  const keys = typeof onChainId === "object" ? Object.keys(onChainId) : [onChainId]
  if (keys.length !== 1) {
    console.log(chainId, "TOO MANY KEYS!", onChainId)
    const res = Object.fromEntries(
      Object.entries(onChainId).map(([key, value]) => [key, parseOnChainId(chainId, value, true)])
    )
    console.log(chainId, "TOO MANY KEYS!RESULT!", res)
    return res
  }

  console.log(chainId, "OBJECT!", onChainId)
  const key: string = keys[0]
  const value =
    typeof onChainId === "object"
      ? parseOnChainId(chainId, onChainId[key as keyof typeof onChainId], true)
      : undefined
  const ret = Enum(key, value)
  console.log(chainId, "OBJECT!RESULT!", ret)
  // if (!recurse)
  //   memoLog(chainId, "OBJECT ASSETID", "in:", onChainId, "out:", JSON.stringify(ret), ret)
  return ret
}

type ScaleStorageCoder = ReturnType<ReturnType<typeof getDynamicBuilder>["buildStorage"]>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tryEncode = (scaleCoder: ScaleStorageCoder | undefined, ...args: any[]) => {
  try {
    return scaleCoder?.enc?.(...args)
  } catch {
    return null
  }
}
