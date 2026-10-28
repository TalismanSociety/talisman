import { beforeEach, describe, expect, it, vi } from "vitest"

import type { NftStoreData } from "../store"
import type { AccountNft, NftCollection } from "../types"
import { migrateNftsV3 } from "./migrateNftsV3"

const blob = vi.hoisted(() => ({ stored: null as unknown, writeFails: false }))

vi.mock("../../../db", () => ({
  getBlobStore: () => {
    const setOrThrow = async (data: unknown) => {
      if (blob.writeFails) throw new Error("write failed")
      blob.stored = data
    }
    return {
      get: async () => blob.stored,
      set: (data: unknown) => setOrThrow(data).catch(() => {}),
      setOrThrow,
    }
  },
}))

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

const migrate = async () => {
  await migrateNftsV3.forward.apply({ password: "" })
  return blob.stored
}

const MIGRATED: NftStoreData = {
  id: "nfts",
  collections: [collection("substrate:polkadot-asset-hub:Nfts:158"), collection("evm:1:0xabc")],
  nfts: [
    nft("substrate:polkadot-asset-hub:Nfts:158:1", "substrate:polkadot-asset-hub:Nfts:158"),
    nft("evm:1:0xabc:7", "evm:1:0xabc"),
  ],
  hiddenNftCollectionIds: ["substrate:polkadot-asset-hub:Nfts:158", "evm:1:0xabc"],
  favoriteNftIds: ["substrate:kusama-asset-hub:Nfts:7:42", "evm:1:0xabc:7"],
}

describe("migrateNftsV3", () => {
  beforeEach(() => {
    blob.stored = null
    blob.writeFails = false
  })

  it("rewrites subscan ids to substrate Nfts ids and drops subscan rows", async () => {
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

    expect(await migrate()).toEqual(MIGRATED)
  })

  it("rewrites a blob that predates hidden collections and favourites", async () => {
    blob.stored = { id: "nfts", nfts: [], collections: [] }

    expect(await migrate()).toEqual({
      id: "nfts",
      nfts: [],
      collections: [],
      hiddenNftCollectionIds: [],
      favoriteNftIds: [],
    })
  })

  it("writes nothing for a wallet without nfts", async () => {
    expect(await migrate()).toBeNull()
  })

  it("fails when the write fails, so the runner retries it", async () => {
    blob.stored = { id: "nfts", nfts: [], collections: [] }
    blob.writeFails = true

    expect(await migrateNftsV3.forward.apply({ password: "" })).toBe(false)
  })

  it("leaves migrated data unchanged", async () => {
    blob.stored = MIGRATED

    expect(await migrate()).toEqual(MIGRATED)
  })
})
