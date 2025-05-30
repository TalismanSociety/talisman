import { isSs58Address } from "@talismn/crypto"
import { sleep } from "@talismn/util"
import { log } from "extension-shared"
import PQueue from "p-queue"

import { AccountNft, AccountNfts, NftCollection } from "./types"

// Talisman ChainId => Subscan chain slug
const NETWORKS: Record<string, string> = {
  "polkadot-asset-hub": "assethub-polkadot",
  "kusama-asset-hub": "assethub-kusama",
}

export const fetchDotAccountNfts = async (address: string): Promise<AccountNfts> => {
  if (!isSs58Address(address)) throw new Error("Address is not an EVM address")

  const results = await Promise.all(
    Object.entries(NETWORKS).map(([chainId, subscanChainId]) =>
      fetchDotAccountChainNfts(address, chainId, subscanChainId),
    ),
  )

  return results.reduce(
    (acc, item) => {
      acc.nfts.push(...item.nfts)
      acc.collections.push(...item.collections)
      return acc
    },
    { nfts: [], collections: [] } as AccountNfts,
  )
}

// Use p-queue to match subscan rate limit of 5 requests per second
// In practice it seems limited at 1 request per second, maybe because we are not using an api key
const subscanQueue = new PQueue({
  interval: 1000,
  intervalCap: 1,
})

// assume collections are not changing often, keep them in memory
const CACHE = new Map<string, NftCollection>()

const fetchDotAccountChainNfts = async (
  address: string,
  chainId: string,
  subscanChainId: string,
): Promise<AccountNfts> => {
  try {
    if (!isSs58Address(address)) throw new Error("Address is not a Polkadot address")

    const allData: GetNftsResponseNft[] = []

    const ITEMS_PER_PAGE = 100
    const MAX_PAGES = 5
    let page = 0

    let resultsCount: number

    do {
      const { data } = await postSubscanWithRetry<GetNftsResponse>(
        `https://${subscanChainId}.api.subscan.io/api/scan/nfts/info/items`,
        JSON.stringify({
          owner: address,
          page,
          row: ITEMS_PER_PAGE,
        }),
      )

      allData.push(...(data.list ?? []))

      page++
      resultsCount = data.count
    } while (allData.length < resultsCount && page < MAX_PAGES)

    const nfts = await Promise.all(
      allData.map(async (nft) => {
        const updatedAt = await getUpdatedAt(nft, subscanChainId)
        return itemToOwnedNft(chainId, nft, address, updatedAt)
      }),
    )

    const collectionIds = [
      ...new Set(allData.map((item) => [item.collection_id, item.collection_name] as const)),
    ]
    const collections = await Promise.all(
      collectionIds.map(async ([collectionId, name]) => {
        try {
          const cacheKey = `nftCollection:subscan:${chainId}:${collectionId}`
          const cached = CACHE.get(cacheKey)
          if (cached) return cached

          const { data } = await postSubscanWithRetry<GetNftInfoResponse>(
            `https://${subscanChainId}.api.subscan.io/api/scan/nfts/info`,
            JSON.stringify({ collection_id: collectionId }),
          )

          const collection = collectionToNftCollection(chainId, collectionId, data)

          CACHE.set(cacheKey, collection)

          return collection
        } catch (err) {
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
    log.error("Failed to fetch Polkadot account NFTs", {
      address,
      chainId,
      subscanChainId,
      error: err,
    })
    throw err
  }
}

const getUpdatedAt = async (nft: GetNftsResponseNft, subscanChainId: string) => {
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
    )

    const timestamps = res.data.list?.map((c) => c.block_timestamp) ?? []
    const updatedAt = Math.max(...timestamps)
    return updatedAt ?? null
  } catch (err) {
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
  contract: "",
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

const postSubscanWithRetry = async <T>(url: string, body: string, maxAttempts = 3) => {
  try {
    const result = await subscanQueue.add(async (): Promise<T> => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Content: "application/json",
        },
        body,
      })

      if (!response.ok)
        throw new Error(`Failed to fetch ${url} (${response.status} - ${response.statusText})`)

      return response.json() as Promise<T>
    })

    if (!result) throw new Error("Failed to fetch")

    return result
  } catch (err) {
    if (!maxAttempts) throw new Error("Failed to fetch - max attempts reached")
    await sleep(1000) // wait before retrying
    return postSubscanWithRetry(url, body, maxAttempts - 1)
  }
}
