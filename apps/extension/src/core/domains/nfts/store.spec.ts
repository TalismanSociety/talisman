import { filter, firstValueFrom } from "rxjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AccountNft, NftCollection } from "./types"

const blob = vi.hoisted(() => ({ stored: null as unknown }))

vi.mock("../../db/blobs", () => ({
  getBlobStore: () => ({
    get: async () => blob.stored,
    set: async () => {},
  }),
}))

vi.mock("../../libs/isWalletReady", () => ({ walletReady: Promise.resolve() }))

const collection = (id: string): NftCollection => ({
  id,
  name: id,
  description: "",
  iconUrl: null,
  bannerUrl: null,
  itemsCount: null,
  ownersCount: null,
  marketplaceUrls: [],
})

const nft = (id: string, collectionId: string): AccountNft => ({
  id,
  collectionId,
  tokenId: "1",
  networkId: "polkadot-asset-hub",
  type: "Polkadot NFT",
  previewUrl: null,
  imageUrl: null,
  videoUrl: null,
  audioUrl: null,
  name: id,
  contract: null,
  nftCollectionId: "158",
  marketplaceUrls: [],
  traits: null,
  price: null,
  owner: "15GHgiQc55ugweKbvZ6UYaDEFoQ3CJVy3NuaiJdB4eYUEzd8",
  amount: 1,
  description: null,
  updatedAt: null,
})

const loadStore = async () => {
  vi.resetModules()
  const { nftsStore$ } = await import("./store")
  return firstValueFrom(nftsStore$.pipe(filter((data) => data.nfts.length > 0)))
}

const MIGRATED = {
  id: "nfts",
  collections: [collection("substrate:polkadot-asset-hub:Nfts:158"), collection("evm:1:0xabc")],
  nfts: [
    nft("substrate:polkadot-asset-hub:Nfts:158:1", "substrate:polkadot-asset-hub:Nfts:158"),
    nft("evm:1:0xabc:7", "evm:1:0xabc"),
  ],
  hiddenNftCollectionIds: ["substrate:polkadot-asset-hub:Nfts:158", "evm:1:0xabc"],
  favoriteNftIds: ["substrate:kusama-asset-hub:Nfts:7:42", "evm:1:0xabc:7"],
}

describe("nfts store", () => {
  beforeEach(() => {
    blob.stored = null
  })

  it("rewrites subscan ids to substrate Nfts ids and drops subscan rows on load", async () => {
    blob.stored = {
      id: "nfts",
      collections: [
        collection("subscan:polkadot-asset-hub:158"),
        collection("substrate:polkadot-asset-hub:Nfts:158"),
        collection("evm:1:0xabc"),
      ],
      nfts: [
        nft("subscan:polkadot-asset-hub:158:1", "subscan:polkadot-asset-hub:158"),
        nft("substrate:polkadot-asset-hub:Nfts:158:1", "substrate:polkadot-asset-hub:Nfts:158"),
        nft("evm:1:0xabc:7", "evm:1:0xabc"),
      ],
      hiddenNftCollectionIds: [
        "subscan:polkadot-asset-hub:158",
        "substrate:polkadot-asset-hub:Nfts:158",
        "evm:1:0xabc",
        "subscan:garbage",
      ],
      favoriteNftIds: ["subscan:kusama-asset-hub:7:42", "evm:1:0xabc:7"],
    }

    expect(await loadStore()).toEqual(MIGRATED)
  })

  it("leaves migrated data unchanged", async () => {
    blob.stored = MIGRATED

    expect(await loadStore()).toEqual(MIGRATED)
  })
})
