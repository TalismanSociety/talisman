import { log } from "@common/log"
import { fetchStorageKeysPaged } from "@talismn/balances"
import type { DotNetwork, NetworkId } from "@talismn/chaindata-provider"
import type { Account } from "@talismn/keyring"
import { isNotNil } from "@talismn/util"
import { uniqBy } from "lodash-es"

import { chainConnectorDot } from "../../rpcs/chain-connector-dot"
import { chaindataProvider } from "../../rpcs/chaindata"
import { isAccountCompatibleWithNetwork } from "../accounts/helpers"
import { activeNetworksStore, isNetworkActive } from "../chaindata/store.activeNetworks"
import { getMetadataDef } from "../metadata/getMetadataDef"
import { getMetadataRpcFromDef } from "../metadata/helpers"
import { fetchNftJsonMetadata } from "./nftJsonMetadata"
import {
  buildNftPalletStorages,
  decodeMetadataUri,
  decodeOwnedItemKey,
  getCollectionMetadataKey,
  getItemMetadataKey,
  getOwnedItemsKeyPrefix,
  type NftPalletStorage,
} from "./nftPalletStorage"
import { normaliseMetadataUri } from "./normaliseMetadataUri"
import {
  getSubstrateNftCollectionId,
  getSubstrateNftId,
  type SubstrateNftRef,
  toSubstrateAccountNft,
  toSubstrateNftCollection,
} from "./toSubstrateNfts"
import type { AccountNfts } from "./types"

const NETWORK_IDS: NetworkId[] = [
  "polkadot-asset-hub",
  "kusama-asset-hub",
  "paseo-asset-hub",
  "westend-asset-hub-testnet",
]

type StorageChange = [key: string, value: `0x${string}` | null]

// keyed on chaindata's specVersion so metadata is looked up once per runtime chaindata knows about
const palletStoragesCache = new Map<string, Promise<NftPalletStorage[]>>()

// on-chain metadata URI by NFT or collection id, null when the chain holds none
const metadataUris = new Map<string, string | null>()

export const fetchDotAccountNfts = async (
  account: Account,
  signal: AbortSignal
): Promise<AccountNfts> => {
  const activeNetworks = await activeNetworksStore.get()

  const results = await Promise.all(
    NETWORK_IDS.map(async (networkId) => {
      const network = await chaindataProvider.getNetworkById(networkId, "polkadot")
      return network &&
        isAccountCompatibleWithNetwork(network, account) &&
        isNetworkActive(network, activeNetworks)
        ? fetchNetworkNfts(network, account.address, signal)
        : null
    })
  )

  return mergeAccountNfts(results.filter(isNotNil))
}

const fetchNetworkNfts = async (
  network: DotNetwork,
  address: string,
  signal: AbortSignal
): Promise<AccountNfts> => {
  try {
    const storages = await getNftPalletStorages(network)
    const results = await Promise.all(
      storages.map((storage) => fetchPalletNfts(network.id, storage, address, signal))
    )
    return mergeAccountNfts(results)
  } catch (err) {
    signal.throwIfAborted()
    log.error("Failed to fetch Polkadot account NFTs", {
      address,
      networkId: network.id,
      error: err,
    })
    throw err
  }
}

const getNftPalletStorages = (network: DotNetwork) => {
  const cacheKey = `${network.id}:${network.specVersion}`
  const cached = palletStoragesCache.get(cacheKey)
  if (cached) return cached

  const storages = loadNftPalletStorages(network.id)
  palletStoragesCache.set(cacheKey, storages)
  storages.catch(() => palletStoragesCache.delete(cacheKey))
  return storages
}

const loadNftPalletStorages = async (networkId: NetworkId) => {
  const metadataRpc = getMetadataRpcFromDef(await getMetadataDef(networkId))
  if (!metadataRpc) throw new Error(`Metadata not available for ${networkId}`)
  return buildNftPalletStorages(metadataRpc)
}

const fetchPalletNfts = async (
  networkId: NetworkId,
  storage: NftPalletStorage,
  address: string,
  signal: AbortSignal
): Promise<AccountNfts> => {
  const keys = await fetchStorageKeysPaged(
    chainConnectorDot,
    networkId,
    getOwnedItemsKeyPrefix(storage, address)
  )
  signal.throwIfAborted()
  if (!keys.length) return { nfts: [], collections: [] }

  const refs: SubstrateNftRef[] = keys.map((key) => ({
    networkId,
    pallet: storage.pallet,
    ...decodeOwnedItemKey(storage, key),
  }))
  const collectionRefs = uniqBy(refs, (ref) => ref.collection)

  await loadMissingMetadataUris(networkId, storage, refs)
  signal.throwIfAborted()

  const [itemJsons, collectionJsons] = await Promise.all([
    Promise.all(refs.map((ref) => fetchJsonForId(getSubstrateNftId(ref), signal))),
    Promise.all(
      collectionRefs.map((ref) => fetchJsonForId(getSubstrateNftCollectionId(ref), signal))
    ),
  ])
  const collectionJsonById = new Map(
    collectionRefs.map((ref, index) => [ref.collection, collectionJsons[index]])
  )

  return {
    nfts: refs.map((ref, index) =>
      toSubstrateAccountNft(
        ref,
        address,
        itemJsons[index],
        collectionJsonById.get(ref.collection) ?? null
      )
    ),
    collections: collectionRefs.map((ref, index) =>
      toSubstrateNftCollection(ref, collectionJsons[index])
    ),
  }
}

const loadMissingMetadataUris = async (
  networkId: NetworkId,
  storage: NftPalletStorage,
  refs: SubstrateNftRef[]
) => {
  const reads = new Map(
    [
      ...refs.map((ref) => ({
        id: getSubstrateNftId(ref),
        storageKey: getItemMetadataKey(storage, ref),
        codec: storage.itemMetadata,
      })),
      ...refs.map((ref) => ({
        id: getSubstrateNftCollectionId(ref),
        storageKey: getCollectionMetadataKey(storage, ref.collection),
        codec: storage.collectionMetadata,
      })),
    ]
      .filter((read) => !metadataUris.has(read.id))
      .map((read) => [read.id, read])
  )
  if (!reads.size) return

  const values = await queryStorageAt(
    networkId,
    [...reads.values()].map((read) => read.storageKey)
  )
  for (const read of reads.values()) {
    const uri = decodeMetadataUri(read.codec, values.get(read.storageKey) ?? null)
    metadataUris.set(read.id, uri === null ? null : normaliseMetadataUri(uri))
  }
}

const queryStorageAt = async (networkId: NetworkId, storageKeys: string[]) => {
  const [result] = await chainConnectorDot.send<{ changes?: StorageChange[] }[]>(
    networkId,
    "state_queryStorageAt",
    [storageKeys]
  )
  if (!Array.isArray(result?.changes))
    throw new Error("Unexpected state_queryStorageAt response shape")
  return new Map(result.changes)
}

const fetchJsonForId = async (id: string, signal: AbortSignal) => {
  const uri = metadataUris.get(id)
  return uri ? fetchNftJsonMetadata(uri, signal) : null
}

const mergeAccountNfts = (results: AccountNfts[]): AccountNfts => ({
  nfts: results.flatMap((result) => result.nfts),
  collections: results.flatMap((result) => result.collections),
})
