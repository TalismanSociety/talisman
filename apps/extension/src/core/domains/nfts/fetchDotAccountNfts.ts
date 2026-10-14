import { log } from "@common/log"
import type { DotNetwork, NetworkId } from "@talismn/chaindata-provider"
import type { Account } from "@talismn/keyring"
import { fetchStorageKeysPaged, type JsonRpcRequestSend, queryStorageAt } from "@talismn/sapi"
import { getQuery$, isNotNil, type QueryResult } from "@talismn/util"
import { isEqual, uniq, uniqBy } from "lodash-es"
import PQueue from "p-queue"
import {
  combineLatest,
  defer,
  distinctUntilChanged,
  finalize,
  ignoreElements,
  map,
  merge,
  type Observable,
  tap,
  throttleTime,
  timer,
} from "rxjs"

import { chainConnectorDot } from "../../rpcs/chain-connector-dot"
import { chaindataProvider } from "../../rpcs/chaindata"
import { isAccountCompatibleWithNetwork } from "../accounts/helpers"
import { activeNetworksStore, isNetworkActive } from "../chaindata/store.activeNetworks"
import { getMetadataDef } from "../metadata/getMetadataDef"
import { getMetadataRpcFromDef } from "../metadata/helpers"
import {
  fetchNftJsonMetadata,
  getCachedNftJsonMetadata,
  isNftJsonMetadataSettled,
  nftJsonMetadataChanged$,
} from "./nftJsonMetadata"
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
import type { NftJsonMetadata } from "./parseNftJsonMetadata"
import { nftsStore$ } from "./store"
import {
  getSubstrateNftCollectionId,
  getSubstrateNftId,
  type SubstrateNftCollectionRef,
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

const FIVE_MINUTES = 5 * 60 * 1000
const ONE_HOUR = 60 * 60 * 1000
const FILL_IN_THROTTLE = 1_000

type Listed<Ref> = { ref: Ref; uri: string | null }

export type SubstrateNftListing = {
  owner: string
  items: Listed<SubstrateNftRef>[]
  collections: Listed<SubstrateNftCollectionRef>[]
}

const palletStoragesBySpecVersion = new Map<string, Promise<NftPalletStorage[]>>()

type OnChainMetadataUri = { uri: string | null; readAt: number }

const onChainMetadataUris = new Map<string, OnChainMetadataUri>()

const isFresh = (entry: OnChainMetadataUri | undefined) =>
  !!entry && Date.now() - entry.readAt < ONE_HOUR

const chainReads = new PQueue({ concurrency: 1 })

const sendTo =
  (networkId: NetworkId): JsonRpcRequestSend =>
  (method, params) =>
    chainConnectorDot.send(networkId, method, params)

const hiddenCollectionIds$ = nftsStore$.pipe(
  map(({ hiddenNftCollectionIds }) => hiddenNftCollectionIds),
  distinctUntilChanged(isEqual)
)

export const getDotAccountNfts$ = (account: Account): Observable<QueryResult<AccountNfts>> =>
  defer(() => {
    const downloads = new AbortController()
    const listing$ = getQuery$({
      namespace: "nfts-dot",
      args: account,
      queryFn: listDotAccountNfts,
      refreshInterval: FIVE_MINUTES,
    })

    const requestDownloads$ = combineLatest([
      listing$,
      hiddenCollectionIds$,
      timer(0, FIVE_MINUTES),
    ]).pipe(
      tap(([listing, hiddenCollectionIds]) => {
        if (listing.status === "loaded")
          requestDownloads(listing.data, hiddenCollectionIds, downloads.signal)
      }),
      ignoreElements()
    )

    const nfts$ = combineLatest([
      listing$,
      hiddenCollectionIds$,
      nftJsonMetadataChanged$.pipe(
        throttleTime(FILL_IN_THROTTLE, undefined, { leading: true, trailing: true })
      ),
    ]).pipe(
      map(([listing, hiddenCollectionIds]): QueryResult<AccountNfts> => {
        if (listing.status === "error") return listing
        if (listing.status === "loading") return { ...listing, data: undefined }
        const requested = new Set(urisToDownload(listing.data, hiddenCollectionIds))
        return {
          ...listing,
          data: toDotAccountNfts(listing.data, (uri) => ({
            json: getCachedNftJsonMetadata(uri),
            isPending: requested.has(uri) && !isNftJsonMetadataSettled(uri),
          })),
        }
      })
    )

    return merge(nfts$, requestDownloads$).pipe(finalize(() => downloads.abort()))
  })

export const listDotAccountNfts = (account: Account, signal: AbortSignal) =>
  chainReads.add(() => listOnChain(account, signal), { signal })

const requestDownloads = (
  listing: SubstrateNftListing,
  hiddenCollectionIds: string[],
  signal: AbortSignal
) => {
  const priority = -listing.items.length
  for (const uri of urisToDownload(listing, hiddenCollectionIds))
    fetchNftJsonMetadata(uri, signal, priority)
}

const urisToDownload = (
  { items, collections }: SubstrateNftListing,
  hiddenCollectionIds: string[]
) =>
  uniq(
    [...items, ...collections]
      .filter(({ ref }) => !hiddenCollectionIds.includes(getSubstrateNftCollectionId(ref)))
      .map(({ uri }) => uri)
      .filter(isNotNil)
  )

type NftMetadata = { json: NftJsonMetadata | null; isPending: boolean }

const NO_METADATA: NftMetadata = { json: null, isPending: false }

export const toDotAccountNfts = (
  { owner, items, collections }: SubstrateNftListing,
  getMetadata: (uri: string) => NftMetadata
): AccountNfts => {
  const metadataOf = (uri: string | null) => (uri ? getMetadata(uri) : NO_METADATA)
  const collectionJsonById = new Map(
    collections.map(({ ref, uri }) => [getSubstrateNftCollectionId(ref), metadataOf(uri).json])
  )
  return {
    nfts: items.map(({ ref, uri }) => {
      const { json, isPending } = metadataOf(uri)
      return {
        ...toSubstrateAccountNft(
          ref,
          owner,
          json,
          collectionJsonById.get(getSubstrateNftCollectionId(ref)) ?? null
        ),
        isMetadataPending: isPending,
      }
    }),
    collections: collections.map(({ ref, uri }) => {
      const { json, isPending } = metadataOf(uri)
      return { ...toSubstrateNftCollection(ref, json), isMetadataPending: isPending }
    }),
  }
}

const listOnChain = async (account: Account, signal: AbortSignal) => {
  const activeNetworks = await activeNetworksStore.get()

  const listings = await Promise.all(
    NETWORK_IDS.map(async (networkId) => {
      const network = await chaindataProvider.getNetworkById(networkId, "polkadot")
      return network &&
        isAccountCompatibleWithNetwork(network, account) &&
        isNetworkActive(network, activeNetworks)
        ? listNetworkNfts(network, account.address, signal)
        : null
    })
  )

  return mergeListings(account.address, listings.filter(isNotNil))
}

const listNetworkNfts = async (
  network: DotNetwork,
  address: string,
  signal: AbortSignal
): Promise<SubstrateNftListing> => {
  try {
    const storages = await getNftPalletStorages(network)
    const listings = await Promise.all(
      storages.map((storage) => listPalletNfts(network.id, storage, address, signal))
    )
    return mergeListings(address, listings)
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
  const cached = palletStoragesBySpecVersion.get(cacheKey)
  if (cached) return cached

  const storages = loadNftPalletStorages(network.id)
  palletStoragesBySpecVersion.set(cacheKey, storages)
  storages.catch(() => palletStoragesBySpecVersion.delete(cacheKey))
  return storages
}

const loadNftPalletStorages = async (networkId: NetworkId) => {
  const metadataRpc = getMetadataRpcFromDef(await getMetadataDef(networkId))
  if (!metadataRpc) throw new Error(`Metadata not available for ${networkId}`)
  return buildNftPalletStorages(metadataRpc)
}

const listPalletNfts = async (
  networkId: NetworkId,
  storage: NftPalletStorage,
  address: string,
  signal: AbortSignal
): Promise<SubstrateNftListing> => {
  const keys = await fetchStorageKeysPaged(
    sendTo(networkId),
    getOwnedItemsKeyPrefix(storage, address),
    { signal }
  )
  if (!keys.length) return { owner: address, items: [], collections: [] }

  const refs: SubstrateNftRef[] = keys.map((key) => ({
    networkId,
    pallet: storage.pallet,
    ...decodeOwnedItemKey(storage, key),
  }))
  const collectionRefs = uniqBy(refs, (ref) => ref.collection)

  const uris = await readMetadataUris(networkId, storage, refs, collectionRefs, signal)

  return {
    owner: address,
    items: refs.map((ref) => ({ ref, uri: uris.get(getSubstrateNftId(ref)) ?? null })),
    collections: collectionRefs.map((ref) => ({
      ref,
      uri: uris.get(getSubstrateNftCollectionId(ref)) ?? null,
    })),
  }
}

const readMetadataUris = async (
  networkId: NetworkId,
  storage: NftPalletStorage,
  refs: SubstrateNftRef[],
  collectionRefs: SubstrateNftCollectionRef[],
  signal: AbortSignal
): Promise<ReadonlyMap<string, string | null>> => {
  const reads = [
    ...refs.map((ref) => ({
      id: getSubstrateNftId(ref),
      storageKey: getItemMetadataKey(storage, ref),
      codec: storage.itemMetadata,
    })),
    ...collectionRefs.map((ref) => ({
      id: getSubstrateNftCollectionId(ref),
      storageKey: getCollectionMetadataKey(storage, ref.collection),
      codec: storage.collectionMetadata,
    })),
  ]
  const unread = reads.filter((read) => !isFresh(onChainMetadataUris.get(read.id)))

  if (unread.length) {
    const values = await queryStorageAt(
      sendTo(networkId),
      unread.map((read) => read.storageKey),
      { signal }
    )
    const readAt = Date.now()
    for (const read of unread) {
      const uri = decodeMetadataUri(read.codec, values.get(read.storageKey) ?? null)
      if (uri === null) onChainMetadataUris.delete(read.id)
      else onChainMetadataUris.set(read.id, { uri: normaliseMetadataUri(uri), readAt })
    }
  }

  return new Map(reads.map((read) => [read.id, onChainMetadataUris.get(read.id)?.uri ?? null]))
}

const mergeListings = (owner: string, listings: SubstrateNftListing[]): SubstrateNftListing => ({
  owner,
  items: listings.flatMap((listing) => listing.items),
  collections: listings.flatMap((listing) => listing.collections),
})
