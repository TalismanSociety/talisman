import { Metadata, TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { assert, BN } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
import {
  BalancesConfigTokenParams,
  ChaindataProvider,
  ChainId,
  githubTokenLogoUrl,
  Token,
} from "@talismn/chaindata-provider"
import {
  $metadataV14,
  filterMetadataPalletsAndItems,
  getMetadataVersion,
  PalletMV14,
  StorageEntryMV14,
} from "@talismn/scale"
import * as $ from "@talismn/subshape-fork"
import { decodeAnyAddress } from "@talismn/util"

import { DefaultBalanceModule, NewBalanceModule, NewTransferParamsType } from "../BalanceModule"
import log from "../log"
import { db as balancesDb } from "../TalismanBalancesDatabase"
import { AddressesByToken, AmountWithLabel, Balances, NewBalanceType } from "../types"
import {
  buildStorageDecoders,
  createTypeRegistryCache,
  findChainMeta,
  GetOrCreateTypeRegistry,
  getUniqueChainIds,
  RpcStateQuery,
  RpcStateQueryHelper,
  StorageHelper,
} from "./util"

type ModuleType = "substrate-assets"
const moduleType: ModuleType = "substrate-assets"

export type SubAssetsToken = Extract<Token, { type: ModuleType }>

const subAssetTokenId = (chainId: ChainId, assetId: string, tokenSymbol: string) =>
  `${chainId}-substrate-assets-${assetId}-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

export type SubAssetsChainMeta = {
  isTestnet: boolean
  miniMetadata: `0x${string}` | null
  metadataVersion: number
}

export type SubAssetsModuleConfig = {
  tokens?: Array<
    {
      assetId: string | number
    } & BalancesConfigTokenParams
  >
}

export type SubAssetsBalance = NewBalanceType<ModuleType, "complex", "substrate">

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "substrate-assets": SubAssetsBalance
  }
}

export type SubAssetsTransferParams = NewTransferParamsType<{
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

export const SubAssetsModule: NewBalanceModule<
  ModuleType,
  SubAssetsToken,
  SubAssetsChainMeta,
  SubAssetsModuleConfig,
  SubAssetsTransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")

  const { getOrCreateTypeRegistry } = createTypeRegistryCache()

  return {
    ...DefaultBalanceModule(moduleType),

    async fetchSubstrateChainMeta(chainId, moduleConfig, metadataRpc) {
      const isTestnet = (await chaindataProvider.chainById(chainId))?.isTestnet || false
      if (metadataRpc === undefined) return { isTestnet, miniMetadata: null, metadataVersion: 0 }

      const metadataVersion = getMetadataVersion(metadataRpc)
      if ((moduleConfig?.tokens ?? []).length < 1)
        return { isTestnet, miniMetadata: null, metadataVersion }

      if (metadataVersion !== 14) return { isTestnet, miniMetadata: null, metadataVersion }

      const metadata = $metadataV14.decode($.decodeHex(metadataRpc))

      const isAssetsPallet = (pallet: PalletMV14) => pallet.name === "Assets"
      const isAccountItem = (item: StorageEntryMV14) => item.name === "Account"
      const isAssetItem = (item: StorageEntryMV14) => item.name === "Asset"
      const isMetadataItem = (item: StorageEntryMV14) => item.name === "Metadata"

      // TODO: Handle metadata v15
      filterMetadataPalletsAndItems(metadata, [
        { pallet: isAssetsPallet, items: [isAccountItem, isAssetItem, isMetadataItem] },
      ])
      metadata.extrinsic.signedExtensions = []

      const miniMetadata = $.encodeHexPrefixed($metadataV14.encode(metadata)) as `0x${string}`

      return {
        isTestnet,
        miniMetadata,
        metadataVersion,
      }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      const { isTestnet, miniMetadata: metadataRpc, metadataVersion } = chainMeta

      if ((moduleConfig?.tokens ?? []).length < 1) return {}

      const registry = new TypeRegistry()
      if (metadataRpc !== null && metadataVersion >= 14)
        registry.setMetadata(new Metadata(registry, metadataRpc))

      const tokens: Record<string, SubAssetsToken> = {}
      for (const tokenConfig of moduleConfig?.tokens ?? []) {
        try {
          const assetId = new BN(tokenConfig.assetId)

          const assetQuery = new StorageHelper(registry, "assets", "asset", assetId)
          const metadataQuery = new StorageHelper(registry, "assets", "metadata", assetId)

          const [
            // e.g.
            // Option<{
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
            // }>
            assetsAsset,

            // e.g.
            // {
            //   deposit: 6,693,333,000
            //   name: RMRK.app
            //   symbol: RMRK
            //   decimals: 10
            //   isFrozen: false
            // }
            assetsMetadata,
          ] = await Promise.all([
            chainConnector
              .send(chainId, "state_getStorage", [assetQuery.stateKey])
              .then((result) => assetQuery.decode(result)),
            chainConnector
              .send(chainId, "state_getStorage", [metadataQuery.stateKey])
              .then((result) => metadataQuery.decode(result)),
          ])

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const unsafeAssetsMetadata = assetsMetadata as any | undefined
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const unsafeAssetsAsset = assetsAsset as any | undefined

          const existentialDeposit =
            unsafeAssetsAsset?.value?.minBalance?.toBigInt?.()?.toString?.() ?? "0"
          const symbol = unsafeAssetsMetadata?.symbol?.toHuman?.() ?? "Unit"
          const decimals = unsafeAssetsMetadata?.decimals?.toNumber?.() ?? 0
          const isFrozen = unsafeAssetsMetadata?.isFrozen?.toHuman?.() ?? false

          const id = subAssetTokenId(chainId, assetId.toString(10), symbol)
          const token: SubAssetsToken = {
            id,
            type: "substrate-assets",
            isTestnet,
            isDefault: tokenConfig?.isDefault ?? true,
            symbol,
            decimals,
            logo: tokenConfig?.logo || githubTokenLogoUrl(id),
            existentialDeposit,
            assetId: assetId.toString(10),
            isFrozen,
            chain: { id: chainId },
          }

          if (tokenConfig?.symbol) token.symbol = tokenConfig?.symbol
          if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
          if (tokenConfig?.dcentName) token.dcentName = tokenConfig?.dcentName
          if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

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
    async subscribeBalances({ addressesByToken }, callback) {
      const queries = await buildQueries(
        chaindataProvider,
        getOrCreateTypeRegistry,
        addressesByToken
      )
      const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
        (error, result) => {
          if (error) callback(error)
          if (result) {
            const balances = result.filter(
              (balance): balance is SubAssetsBalance => balance !== null
            )
            if (balances.length > 0) callback(null, new Balances(balances))
          }
        }
      )

      return unsubscribe
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const queries = await buildQueries(
        chaindataProvider,
        getOrCreateTypeRegistry,
        addressesByToken
      )
      const result = await new RpcStateQueryHelper(chainConnectors.substrate, queries).fetch()
      const balances = result.filter((balance): balance is SubAssetsBalance => balance !== null)
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

      if (token.type !== "substrate-assets")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.chainById(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const { genesisHash } = chain

      const id = token.assetId

      const pallet = "assets"
      const method =
        // the assets pallet has no transferAll method
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
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubAssetsToken>
): Promise<Array<RpcStateQuery<SubAssetsBalance | null>>> {
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
  const chainStorageDecoders = buildStorageDecoders({
    chains,
    miniMetadatas,
    moduleType: "substrate-assets",
    decoders: { storageDecoder: ["assets", "account"] },
  })

  return Object.entries(addressesByToken).flatMap(([tokenId, addresses]) => {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      return []
    }

    if (token.type !== "substrate-assets") {
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

    const [chainMeta] = findChainMeta<typeof SubAssetsModule>(
      miniMetadatas,
      "substrate-assets",
      chain
    )
    const registry =
      chainMeta?.miniMetadata !== undefined &&
      chainMeta?.miniMetadata !== null &&
      chainMeta?.metadataVersion >= 14
        ? getOrCreateTypeRegistry(chainId, chainMeta.miniMetadata)
        : new TypeRegistry()

    return addresses.flatMap((address): RpcStateQuery<SubAssetsBalance | null> | [] => {
      const storageHelper = new StorageHelper(
        registry,
        "assets",
        "account",
        token.assetId,
        decodeAnyAddress(address)
      )
      const storageDecoder = chainStorageDecoders.get(chainId)?.storageDecoder
      const stateKey = storageHelper.stateKey
      if (!stateKey) return []
      const decodeResult = (change: string | null) => {
        // e.g.
        // Option<{
        //   balance: 2,000,000,000
        //   isFrozen: false
        //   reason: Sufficient
        //   extra: null
        // }>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const balance: any = ((storageDecoder && change !== null
          ? storageDecoder.decode($.decodeHex(change))
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any
            null) as any) ?? { balance: 0n, status: "Liquid" }

        const isFrozen = balance?.status === "Frozen"
        const amount = (balance?.balance ?? 0n).toString()

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
          source: "substrate-assets",

          status: "live",

          address,
          multiChainId: { subChainId: chainId },
          chainId,
          tokenId: token.id,
          values: balanceValues,
        } as SubAssetsBalance
      }

      return { chainId, stateKey, decodeResult }
    })
  })
}
