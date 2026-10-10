import type { NetworkId } from "@talismn/chaindata-provider"

import type { NftJsonMetadata } from "./nftJsonMetadata"
import type { NftPalletName } from "./nftPalletStorage"
import { normaliseMetadataUri } from "./normaliseMetadataUri"
import type { AccountNft, NftCollection } from "./types"

export type SubstrateNftCollectionRef = {
  networkId: NetworkId
  pallet: NftPalletName
  collection: number
}

export type SubstrateNftRef = SubstrateNftCollectionRef & { item: number }

const SUBSCAN_SLUGS: Partial<Record<NetworkId, string>> = {
  "polkadot-asset-hub": "assethub-polkadot",
  "kusama-asset-hub": "assethub-kusama",
}

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogv"]
const HIDDEN_TRAITS = ["name", "description"]

const getSubscanUrl = ({ networkId, pallet }: SubstrateNftCollectionRef, path: string) => {
  const slug = pallet === "Nfts" ? SUBSCAN_SLUGS[networkId] : undefined
  return slug ? [`https://${slug}.subscan.io/${path}`] : []
}

const getExternalUrl = (json: NftJsonMetadata | null) =>
  json?.external_url && /^https?:\/\//i.test(json.external_url) ? [json.external_url] : []

const getImageUrl = (json: NftJsonMetadata | null) =>
  json?.image ? normaliseMetadataUri(json.image) : null

const getVideoUrl = (json: NftJsonMetadata | null) => {
  const url = json?.animation_url ? normaliseMetadataUri(json.animation_url) : null
  if (!url) return null
  const pathname = new URL(url).pathname.toLowerCase()
  return VIDEO_EXTENSIONS.some((extension) => pathname.endsWith(extension)) ? url : null
}

const getTraits = (json: NftJsonMetadata | null) => {
  const traits = (json?.attributes ?? []).filter((a) => !HIDDEN_TRAITS.includes(a.trait_type))
  return traits.length ? Object.fromEntries(traits.map((a) => [a.trait_type, a.value])) : null
}

const getCollectionName = (ref: SubstrateNftCollectionRef, json: NftJsonMetadata | null) =>
  json?.name || `Collection ${ref.collection}`

export const getSubstrateNftCollectionId = ({
  networkId,
  pallet,
  collection,
}: SubstrateNftCollectionRef) => `substrate:${networkId}:${pallet}:${collection}`

export const getSubstrateNftId = (ref: SubstrateNftRef) =>
  `${getSubstrateNftCollectionId(ref)}:${ref.item}`

export const toSubstrateAccountNft = (
  ref: SubstrateNftRef,
  owner: string,
  json: NftJsonMetadata | null,
  collectionJson: NftJsonMetadata | null
): AccountNft => {
  const imageUrl = getImageUrl(json)

  return {
    id: getSubstrateNftId(ref),
    collectionId: getSubstrateNftCollectionId(ref),
    contract: null,
    nftCollectionId: String(ref.collection),
    tokenId: String(ref.item),
    networkId: ref.networkId,
    name: json?.name || `${getCollectionName(ref, collectionJson)} #${ref.item}`,
    description: json?.description ?? null,
    type: "Polkadot NFT",
    previewUrl: imageUrl,
    imageUrl,
    videoUrl: getVideoUrl(json),
    audioUrl: null,
    owner,
    amount: 1,
    marketplaceUrls: [
      ...getSubscanUrl(ref, `nft_item/${ref.collection}-${ref.item}`),
      ...getExternalUrl(json),
    ],
    traits: getTraits(json),
    price: null,
    updatedAt: null,
  }
}

export const toSubstrateNftCollection = (
  ref: SubstrateNftCollectionRef,
  json: NftJsonMetadata | null
): NftCollection => {
  const imageUrl = getImageUrl(json)

  return {
    id: getSubstrateNftCollectionId(ref),
    name: getCollectionName(ref, json),
    description: json?.description ?? "",
    iconUrl: imageUrl,
    bannerUrl: imageUrl,
    itemsCount: null,
    ownersCount: null,
    marketplaceUrls: [
      ...getSubscanUrl(ref, `nft_collection/${ref.collection}`),
      ...getExternalUrl(json),
    ],
  }
}
