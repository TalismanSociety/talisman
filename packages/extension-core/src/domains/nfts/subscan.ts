// import { isSs58Address } from "@talismn/crypto"

// import { Nft, NftCollection } from "./types"

// // Talisman ChainId => Subscan chain slug
// const NETWORKS: Record<string, string> = {
//   "polkadot-asset-hub": "assethub-polkadot",
// }

// const COLLECTION_CACHE_TTL = 60 * 60 // 1 hour

// const postWithRetry = async <T>(url: string, body: string, maxAttempts = 5) => {
//   try {
//     const response = await fetch(url, {
//       method: "POST",
//       headers: {
//         Accept: "application/json",
//         Content: "application/json",
//         //	'x-api-key': env.SUBSCAN_API_KEY,
//       },
//       body,
//     })
//     if (!response.ok) {
//       console.log(`ERROR: ${response.status} - ${response.statusText}`)
//       console.log(await response.json())
//       throw new Error(`Failed to fetch nfts (${response.status} - ${response.statusText})`)
//     }

//     return response.json() as Promise<T>
//   } catch (err) {
//     console.error("Error in postWithRetry:", err)
//     if (!maxAttempts) throw new Error("Failed to fetch nfts -- giving up")
//     await sleep(1500)
//     return postWithRetry(url, body, maxAttempts - 1)
//   }
// }

// const fetchDotAccountChainNfts = async (
//   address: string,
//   chainId: string,
//   subscanChainId: string,
// ): Promise<AccountNfts> => {
//   try {
//     if (!isSs58Address(address)) throw new Error("Address is not a Polkadot address")

//     const allData: GetNftsResponseNft[] = []

//     const ITEMS_PER_PAGE = 100
//     const MAX_PAGES = 5
//     let page = 0

//     let resultsCount: number

//     do {
//       const { data } = await postWithRetry<GetNftsResponse>(
//         `https://${subscanChainId}.api.subscan.io/api/scan/nfts/account/balances`,
//         JSON.stringify({
//           address,
//           page,
//           row: ITEMS_PER_PAGE,
//         }),
//       )

//       allData.push(...(data.list ?? []))

//       page++
//       resultsCount = data.count
//     } while (allData.length < resultsCount && page < MAX_PAGES)

//     const nfts = allData.map((nft) => itemToOwnedNft(chainId, nft, address))

//     const collectionIds = [
//       ...new Set(allData.map((item) => [item.collection_id, item.collection_name] as const)),
//     ]
//     const collections = await Promise.all(
//       collectionIds.map(async ([collectionId, name]) => {
//         try {
//           // const cacheKey = `nftCollection:subscan:${chainId}:${collectionId}`;
//           // const cached = await env.ASSET_DISCOVERY_CACHE.get(cacheKey);
//           // if (cached) return JSON.parse(cached) as NftCollection;

//           const { data } = await postWithRetry<GetNftInfoResponse>(
//             `https://${subscanChainId}.api.subscan.io/api/scan/nfts/info`,
//             JSON.stringify({ collection_id: collectionId }),
//           )

//           const collection = collectionToNftCollection(chainId, collectionId, data)
//           // await env.ASSET_DISCOVERY_CACHE.put(cacheKey, JSON.stringify(collection), { expirationTtl: COLLECTION_CACHE_TTL });
//           return collection
//         } catch (err) {
//           // fallback

//           return collectionToNftCollection(chainId, collectionId, {
//             collection_id: collectionId,
//             data: "",
//             owner: { address: "", people: {} },
//             total_supply: 0,
//             items: 0,
//             is_destroyed: false,
//             holders: 0,
//             unique_id: "",
//             attributes: { name },
//             metadata: {},
//           })
//         }
//       }),
//     )

//     return { nfts, collections: collections.filter(Boolean) as NftCollection[] }
//   } catch (e) {
//     console.error(e)
//     throw e
//   }
// }

// export const fetchDotAccountNfts = async (address: string, attempt = 0): Promise<AccountNfts> => {
//   if (!isSs58Address(address)) throw new Error("Address is not an EVM address")

//   const results = await Promise.all(
//     Object.entries(NETWORKS).map(([chainId, subscanChainId]) =>
//       fetchDotAccountChainNfts(address, chainId, subscanChainId),
//     ),
//   )

//   return results.reduce(
//     (acc, item) => {
//       acc.nfts.push(...item.nfts)
//       acc.collections.push(...item.collections)
//       return acc
//     },
//     { nfts: [], collections: [] } as AccountNfts,
//   )
// }

// type GetNftsResponse = {
//   code: number
//   message: string
//   generated_at: number
//   data: GetNftsResponseData
// }

// type GetNftsResponseData = {
//   count: number
//   list: GetNftsResponseNft[]
// }

// type GetNftsResponseNft = {
//   collection_id: string
//   collection_name: string
//   item_id: string
//   balance: string
//   token_metadata: {
//     name: string
//     image: string
//     fallback_image?: string
//     media?: { types: string; url: string }[]
//   }
// }

// type GetNftInfoResponse = {
//   code: number
//   message: string
//   generated_at: number
//   data: GetNftInfoResponseData
// }

// type GetNftInfoResponseData = {
//   collection_id: string
//   data: string // ipfs metadata
//   owner: {
//     address: string
//     people: Record<string, string>
//   }
//   total_supply: number // unsafe
//   items: number
//   is_destroyed: boolean
//   holders: number
//   unique_id: string
//   attributes: unknown
//   metadata: {
//     description?: string
//     name?: string
//     image?: string // ipfs
//     local_image?: string // safe url
//     fallback_image?: string // safe url
//     thumbnail?: string
//     external_url?: string
//   }
// }

// type NftBase = Omit<Nft, "owners">

// type AccountNft = NftBase & {
//   owner: string
//   amount: number
// }

// type AccountNfts = { nfts: AccountNft[]; collections: NftCollection[] }

// const itemToOwnedNft = (chainId: string, nft: GetNftsResponseNft, address: string): AccountNft => ({
//   id: `subscan:${chainId}:${nft.collection_id}:${nft.item_id}`,
//   collectionId: `subscan:${chainId}:${nft.collection_id}`,
//   contract: "",
//   tokenId: nft.item_id,
//   networkId: chainId,
//   name: nft.token_metadata.name,
//   type: "Polkadot NFT",
//   previewUrl: nft.token_metadata.image, // TODO thumbnail
//   imageUrl: nft.token_metadata.image,
//   videoUrl: null,
//   audioUrl: null,
//   owner: address,
//   amount: 1,
//   marketplaceUrls: [
//     `https://${NETWORKS[chainId]}.subscan.io/nft_item/${nft.collection_id}-${nft.item_id}`,
//   ],
//   traits: null,
//   price: null,
// })

// const collectionToNftCollection = (
//   chainId: string,
//   collectionId: string,
//   collection: GetNftInfoResponseData,
// ): NftCollection => ({
//   id: `subscan:${chainId}:${collectionId}`,
//   name: collection.metadata.name ?? "",
//   description: collection.metadata.description ?? "",
//   iconUrl:
//     collection.metadata.local_image ??
//     collection.metadata.image ??
//     collection.metadata.fallback_image ??
//     null,
//   bannerUrl:
//     collection.metadata.local_image ??
//     collection.metadata.image ??
//     collection.metadata.fallback_image ??
//     null,
//   itemsCount: collection.items,
//   ownersCount: collection.holders,
//   marketplaceUrls: [
//     `https://${NETWORKS[chainId]}.subscan.io/nft_collection/${collectionId}`,
//     collection.metadata.external_url,
//   ].filter(Boolean) as string[],
// })

// const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
