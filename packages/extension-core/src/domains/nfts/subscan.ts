import { Account } from "@talismn/keyring"
import { isNotNil } from "@talismn/util"
import { log } from "extension-shared"
import { fromPairs, toPairs } from "lodash-es"
import PQueue from "p-queue"

import { chaindataProvider } from "../../rpcs/chaindata"
import { isAccountCompatibleWithNetwork } from "../accounts/helpers"
import { activeNetworksStore, isNetworkActive } from "../balances/store.activeNetworks"
import { AccountNft, AccountNfts, NftCollection } from "./types"

// Talisman ChainId => Subscan chain slug
const NETWORKS: Record<string, string> = {
  "polkadot-asset-hub": "assethub-polkadot",
  "kusama-asset-hub": "assethub-kusama",
  // "mythos": "mythos", // it works but they all seem like technical collections without name nor image
}

// Use a global promise queue to comply with subscan rate limit of 5 requests per second
// In practice it seems limited at 1 request per second, most likely because we are not using an api key
// The rate limit is global to all of their subdomains
// TODO maybe implement something based on http headers ? https://support.subscan.io/doc-362600
const SUBSCAN_QUEUE = new PQueue({
  interval: 1000,
  intervalCap: 1,
})

// Use another promise queue to ensure accounts are processed only one at a time.
// This helps displaying first results faster on the front end
const ACCOUNTS_QUEUE = new PQueue({
  concurrency: 1,
})

export const fetchDotAccountNfts = async (
  account: Account,
  signal: AbortSignal,
): Promise<AccountNfts> => {
  const result = await ACCOUNTS_QUEUE.add(
    async () => {
      const activeChains = await activeNetworksStore.get()

      const results = await Promise.all(
        Object.keys(NETWORKS).map(async (networkId) => {
          const network = await chaindataProvider.getNetworkById(networkId)
          return network &&
            isAccountCompatibleWithNetwork(network, account) &&
            isNetworkActive(network, activeChains)
            ? fetchDotAccountChainNfts(account.address, networkId, signal)
            : null
        }),
      )

      return results.filter(isNotNil).reduce(
        (acc, item) => {
          acc.nfts.push(...item.nfts)
          for (const col of item.collections)
            if (!acc.collections.some((c) => c.id === col.id)) acc.collections.push(col)
          return acc
        },
        { nfts: [], collections: [] } as AccountNfts,
      )
    },
    { signal },
  )

  if (!result) throw new Error(`Failed to fetch dot nfts for ${account.address}`)

  return result
}

const postSubscanWithRetry = async <T>(
  url: string,
  body: string,
  signal: AbortSignal,
  maxAttempts = 3,
) => {
  try {
    const result = await SUBSCAN_QUEUE.add(
      async (): Promise<T> => {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Content: "application/json",
          },
          body,
          signal,
        })

        if (!response.ok)
          throw new Error(`Failed to fetch ${url} (${response.status} - ${response.statusText})`)

        return response.json() as Promise<T>
      },
      {
        timeout: 10_000,
        throwOnTimeout: true,
        signal,
      },
    )

    if (!result) throw new Error("Failed to fetch")

    return result
  } catch (err) {
    signal.throwIfAborted()
    if (!maxAttempts) throw new Error("Failed to fetch - max attempts reached")
    return postSubscanWithRetry(url, body, signal, maxAttempts - 1)
  }
}

// assume collections are not changing often, keep them in memory
const CACHE = new Map<string, NftCollection>()

const fetchDotAccountChainNfts = async (
  address: string,
  chainId: string,
  signal: AbortSignal,
): Promise<AccountNfts> => {
  try {
    const allData: GetNftsResponseNft[] = []

    const subscanChainId = NETWORKS[chainId]
    const ITEMS_PER_PAGE = 100
    const MAX_PAGES = 5
    let page = 0

    let resultsCount: number

    do {
      signal.throwIfAborted()

      const { data } = await postSubscanWithRetry<GetNftsResponse>(
        `https://${subscanChainId}.api.subscan.io/api/scan/nfts/info/items`,
        JSON.stringify({
          owner: address,
          page,
          row: ITEMS_PER_PAGE,
        }),
        signal,
      )

      allData.push(...(data.list ?? []))

      page++
      resultsCount = data.count
    } while (allData.length < resultsCount && page < MAX_PAGES)

    const nfts = await Promise.all(
      allData.map(async (nft) => {
        const updatedAt = await getUpdatedAt(nft, subscanChainId, signal)
        return itemToOwnedNft(chainId, nft, address, updatedAt)
      }),
    )

    // this clears up duplicates along the way
    const collectionNameById = fromPairs(
      allData.map((item) => [item.collection_id, item.collection_name] as const),
    )

    const collections = await Promise.all(
      toPairs(collectionNameById).map(async ([collectionId, name]) => {
        try {
          const cacheKey = `nftCollection:subscan:${chainId}:${collectionId}`
          const cached = CACHE.get(cacheKey)
          if (cached) return cached

          const { data } = await postSubscanWithRetry<GetNftInfoResponse>(
            `https://${subscanChainId}.api.subscan.io/api/scan/nfts/info`,
            JSON.stringify({ collection_id: collectionId }),
            signal,
          )

          const collection = collectionToNftCollection(chainId, collectionId, data)

          CACHE.set(cacheKey, collection)

          return collection
        } catch (err) {
          signal.throwIfAborted()

          // fallback
          return collectionToNftCollection(chainId, collectionId, {
            collection_id: collectionId,
            data: "",
            owner: { address: "", people: {} },
            total_supply: 0,
            items: 0,
            is_destroyed: false,
            holders: 0,
            unique_id: "",
            attributes: { name },
            metadata: {},
          })
        }
      }),
    )

    return { nfts, collections: collections.filter(Boolean) as NftCollection[] }
  } catch (err) {
    signal.throwIfAborted()
    log.error("Failed to fetch Polkadot account NFTs", {
      address,
      chainId,
      error: err,
    })
    throw err
  }
}

const getUpdatedAt = async (
  nft: GetNftsResponseNft,
  subscanChainId: string,
  signal: AbortSignal,
) => {
  try {
    const res = await postSubscanWithRetry<{
      data: {
        list: { block_timestamp: number }[]
      }
    }>(
      `https://${subscanChainId}.api.subscan.io/api/scan/nfts/activities`,
      JSON.stringify({
        item_id: nft.item_id,
        collection_id: nft.collection_id,
        row: 100,
        page: 0,
      }),
      signal,
    )

    const timestamps = res.data.list?.map((c) => c.block_timestamp * 1000) ?? []
    return timestamps.length ? Math.max(...timestamps) : null
  } catch (err) {
    signal.throwIfAborted()
    log.error("Failed to fetch Polkadot NFT date", {
      nft,
      error: err,
    })
    return null
  }
}

type GetNftsResponse = {
  code: number
  message: string
  generated_at: number
  data: GetNftsResponseData
}

type GetNftsResponseData = {
  count: number
  list: GetNftsResponseNft[]
}

type GetNftsResponseNft = {
  item_id: string
  collection_id: string
  collection_name: string

  metadata: {
    name: string | null
    description: string | null
    image: string | null
    external_url?: string | null
    attributes?: { trait_type: string; value: unknown }[]
    local_image?: string
    thumbnail?: string
  }
}

type GetNftInfoResponse = {
  code: number
  message: string
  generated_at: number
  data: GetNftInfoResponseData
}

type GetNftInfoResponseData = {
  collection_id: string
  data: string // ipfs metadata
  owner: {
    address: string
    people: Record<string, string>
  }
  total_supply: number // unsafe
  items: number
  is_destroyed: boolean
  holders: number
  unique_id: string
  attributes: unknown
  metadata: {
    description?: string
    name?: string
    image?: string // ipfs
    local_image?: string // safe url
    fallback_image?: string // safe url
    thumbnail?: string
    external_url?: string
  }
}

const itemToOwnedNft = (
  chainId: string,
  nft: GetNftsResponseNft,
  address: string,
  updatedAt: number | null,
): AccountNft => ({
  id: `subscan:${chainId}:${nft.collection_id}:${nft.item_id}`,
  collectionId: `subscan:${chainId}:${nft.collection_id}`,
  contract: null,
  nftCollectionId: nft.collection_id,
  tokenId: nft.item_id,
  networkId: chainId,
  name: nft.metadata.name ?? "",
  description: nft.metadata.description,
  type: "Polkadot NFT",
  previewUrl: nft.metadata.thumbnail || nft.metadata.local_image || nft.metadata.image,
  imageUrl: nft.metadata.image,
  videoUrl: null,
  audioUrl: null,
  owner: address,
  amount: 1,
  marketplaceUrls: [
    `https://${NETWORKS[chainId]}.subscan.io/nft_item/${nft.collection_id}-${nft.item_id}`,
  ],
  traits: nft.metadata.attributes
    ? Object.fromEntries(
        nft.metadata.attributes
          .map((a) => [a.trait_type, a.value] as const)
          .filter(
            ([key, value]) =>
              !["name", "description"].includes(key) &&
              (typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean"),
          ),
      )
    : null,
  price: null,
  updatedAt,
})

const collectionToNftCollection = (
  chainId: string,
  collectionId: string,
  collection: GetNftInfoResponseData,
): NftCollection => ({
  id: `subscan:${chainId}:${collectionId}`,
  name: collection.metadata.name ?? "",
  description: collection.metadata.description ?? "",
  iconUrl:
    collection.metadata.local_image ??
    collection.metadata.image ??
    collection.metadata.fallback_image ??
    null,
  bannerUrl:
    collection.metadata.local_image ??
    collection.metadata.image ??
    collection.metadata.fallback_image ??
    null,
  itemsCount: collection.items,
  ownersCount: collection.holders,
  marketplaceUrls: [
    `https://${NETWORKS[chainId]}.subscan.io/nft_collection/${collectionId}`,
    collection.metadata.external_url,
  ].filter(Boolean) as string[],
})
