import { Metadata, TypeRegistry } from "@polkadot/types"
import { BN, assert } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
import {
  AddressesByToken,
  Amount,
  Balance,
  Balances,
  DefaultBalanceModule,
  GetOrCreateTypeRegistry,
  NewBalanceModule,
  NewBalanceType,
  NewTransferParamsType,
  RpcStateQuery,
  RpcStateQueryHelper,
  StorageHelper,
  createTypeRegistryCache,
  findChainMeta,
} from "@talismn/balances"
import {
  ChainId,
  ChaindataProvider,
  NewTokenType,
  SubChainId,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import {
  filterMetadataPalletsAndItems,
  metadataIsV14,
  mutateMetadata,
} from "@talismn/mutate-metadata"
import { decodeAnyAddress } from "@talismn/util"

import log from "./log"

type ModuleType = "substrate-assets"

const subAssetTokenId = (chainId: ChainId, assetId: string, tokenSymbol: string) =>
  `${chainId}-substrate-assets-${assetId}-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

export type SubAssetsToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    assetId: string
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
  metadata: `0x${string}` | null
  metadataVersion: number
}

export type SubAssetsModuleConfig = {
  tokens?: Array<{
    assetId: string | number
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
    ...DefaultBalanceModule("substrate-assets"),

    async fetchSubstrateChainMeta(chainId) {
      const isTestnet = (await chaindataProvider.getChain(chainId))?.isTestnet || false

      const metadataRpc = await chainConnector.send(chainId, "state_getMetadata", [])

      const pjsMetadata: Metadata = new Metadata(new TypeRegistry(), metadataRpc)
      pjsMetadata.registry.setMetadata(pjsMetadata)

      const metadata = await mutateMetadata(metadataRpc, (metadata) => {
        // we can't parse metadata < v14
        //
        // as of v14 the type information required to interact with a chain is included in the chain metadata
        // https://github.com/paritytech/substrate/pull/8615
        //
        // before this change, the client needed to already know the type information ahead of time
        if (!metadataIsV14(metadata)) return null

        const isAssetsPallet = (pallet: { name: string }) => pallet.name === "Assets"
        const isAccountItem = (item: { name: string }) => item.name === "Account"
        const isAssetItem = (item: { name: string }) => item.name === "Asset"
        const isMetadataItem = (item: { name: string }) => item.name === "Metadata"

        filterMetadataPalletsAndItems(metadata, [
          { pallet: isAssetsPallet, items: [isAccountItem, isAssetItem, isMetadataItem] },
        ])

        // ditch the chain's signedExtensions, we don't need them for balance lookups
        // and the polkadot.js TypeRegistry will complain when it can't find the types for them
        metadata.value.extrinsic.signedExtensions = []

        return metadata
      })

      return {
        isTestnet,
        metadata,
        metadataVersion: pjsMetadata.version,
      }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      const { isTestnet, metadata: metadataRpc, metadataVersion } = chainMeta

      const registry = new TypeRegistry()
      if (metadataRpc !== null && metadataVersion >= 14)
        registry.setMetadata(new Metadata(registry, metadataRpc))

      const tokens: Record<string, SubAssetsToken> = {}
      for (const tokenConfig of moduleConfig?.tokens || []) {
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
          const symbol =
            tokenConfig.symbol ?? unsafeAssetsMetadata?.symbol?.toHuman?.() ?? "Unknown"
          const decimals = unsafeAssetsMetadata?.decimals?.toNumber?.() ?? 0
          const isFrozen = unsafeAssetsMetadata?.isFrozen?.toHuman?.() ?? false
          const coingeckoId =
            typeof tokenConfig.coingeckoId === "string" ? tokenConfig.coingeckoId : undefined

          const id = subAssetTokenId(chainId, assetId.toString(10), symbol)
          const token: SubAssetsToken = {
            id,
            type: "substrate-assets",
            isTestnet,
            symbol,
            decimals,
            logo: githubTokenLogoUrl(id),
            coingeckoId,
            existentialDeposit,
            assetId: assetId.toString(10),
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
    async subscribeBalances(addressesByToken, callback) {
      const queries = await buildQueries(
        chaindataProvider,
        getOrCreateTypeRegistry,
        addressesByToken
      )
      const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
        (error, result) => (error ? callback(error) : callback(null, new Balances(result ?? [])))
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
    }) {
      const token = await chaindataProvider.getToken(tokenId)
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-assets")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.getChain(chainId)
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
        { metadataRpc, registry }
      )

      return { type: "substrate", tx: unsigned }
    },
  }
}

async function buildQueries(
  chaindataProvider: ChaindataProvider,
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubAssetsToken>
): Promise<Array<RpcStateQuery<Balance>>> {
  const chains = await chaindataProvider.chains()
  const tokens = await chaindataProvider.tokens()

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

    const chainMeta = findChainMeta<typeof SubAssetsModule>("substrate-assets", chain)
    const registry =
      chainMeta?.metadata !== undefined &&
      chainMeta?.metadata !== null &&
      chainMeta?.metadataVersion >= 14
        ? getOrCreateTypeRegistry(chainId, chainMeta.metadata)
        : new TypeRegistry()

    return addresses.flatMap((address): RpcStateQuery<Balance> | [] => {
      const storageHelper = new StorageHelper(
        registry,
        "assets",
        "account",
        token.assetId,
        decodeAnyAddress(address)
      )
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
        const balance: any = (storageHelper.decode(change) as any)?.value ?? {
          balance: "0",
          isFrozen: false,
        }
        const isFrozen = balance?.isFrozen?.toHuman?.()
        const amount = (balance?.balance?.toBigInt?.() ?? 0n).toString()

        const free = token.isFrozen || isFrozen ? "0" : amount
        const frozen = token.isFrozen ? amount : "0"

        return new Balance({
          source: "substrate-assets",

          status: "live",

          address,
          multiChainId: { subChainId: chainId },
          chainId,
          tokenId: token.id,

          free,
          locks: frozen,
        })
      }

      return { chainId, stateKey, decodeResult }
    })
  })
}
