import { IPFS_GATEWAY } from "@common/constants"
import { describe, expect, it } from "vitest"

import type { NftJsonMetadata } from "./nftJsonMetadata"
import {
  type SubstrateNftRef,
  toSubstrateAccountNft,
  toSubstrateNftCollection,
} from "./toSubstrateNfts"

const OWNER = "15GHgiQc55ugweKbvZ6UYaDEFoQ3CJVy3NuaiJdB4eYUEzd8"
const CID = "bafkreicgj674v7yqduga6angw3d4cvrlnfrgqp2grt53sq64gnpvodjepu"

const PAH_NFT: SubstrateNftRef = {
  networkId: "polkadot-asset-hub",
  pallet: "Nfts",
  collection: 158,
  item: 2407162256,
}

const JSON_METADATA: NftJsonMetadata = {
  name: "Chaotic #1",
  description: "A chaotic thing",
  image: `ipfs://ipfs/${CID}/image.png`,
  animation_url: `ipfs://${CID}/clip.MP4`,
  external_url: "https://chaotic.art/nft/1",
  attributes: [
    { trait_type: "Background", value: "Blue" },
    { trait_type: "Level", value: 3 },
    { trait_type: "Shiny", value: false },
    { trait_type: "name", value: "Chaotic #1" },
    { trait_type: "description", value: "dup" },
  ],
}

describe("toSubstrateAccountNft", () => {
  it("maps the JSON metadata of an NFT", () => {
    expect(toSubstrateAccountNft(PAH_NFT, OWNER, JSON_METADATA, { name: "Chaotic" })).toEqual({
      id: "substrate:polkadot-asset-hub:Nfts:158:2407162256",
      collectionId: "substrate:polkadot-asset-hub:Nfts:158",
      contract: null,
      nftCollectionId: "158",
      tokenId: "2407162256",
      networkId: "polkadot-asset-hub",
      name: "Chaotic #1",
      description: "A chaotic thing",
      type: "Polkadot NFT",
      previewUrl: `${IPFS_GATEWAY}${CID}/image.png`,
      imageUrl: `${IPFS_GATEWAY}${CID}/image.png`,
      videoUrl: `${IPFS_GATEWAY}${CID}/clip.MP4`,
      audioUrl: null,
      owner: OWNER,
      amount: 1,
      marketplaceUrls: [
        "https://assethub-polkadot.subscan.io/nft_item/158-2407162256",
        "https://chaotic.art/nft/1",
      ],
      traits: { Background: "Blue", Level: 3, Shiny: false },
      price: null,
      updatedAt: null,
    })
  })

  it.each(["model.glb", "page.html", "clip.mp4.json"])(
    "keeps an animation_url ending in %s out of the video slot",
    (file) => {
      const nft = toSubstrateAccountNft(
        PAH_NFT,
        OWNER,
        { ...JSON_METADATA, animation_url: `https://example.com/${file}` },
        null
      )
      expect(nft.videoUrl).toBeNull()
    }
  )

  it("still returns an NFT without JSON metadata, named after its collection", () => {
    const nft = toSubstrateAccountNft(PAH_NFT, OWNER, null, { name: "Chaotic" })

    expect(nft).toMatchObject({
      id: "substrate:polkadot-asset-hub:Nfts:158:2407162256",
      name: "Chaotic #2407162256",
      description: null,
      previewUrl: null,
      imageUrl: null,
      videoUrl: null,
      traits: null,
      marketplaceUrls: ["https://assethub-polkadot.subscan.io/nft_item/158-2407162256"],
    })
  })

  it("names an NFT after its collection id when no JSON is available at all", () => {
    expect(toSubstrateAccountNft(PAH_NFT, OWNER, null, null).name).toBe(
      "Collection 158 #2407162256"
    )
  })

  it("drops an image that cannot be loaded and an external_url that is not a web page", () => {
    const nft = toSubstrateAccountNft(
      PAH_NFT,
      OWNER,
      { image: "ar://abc", external_url: "javascript:alert(1)" },
      null
    )
    expect(nft.imageUrl).toBeNull()
    expect(nft.previewUrl).toBeNull()
    expect(nft.marketplaceUrls).toEqual([
      "https://assethub-polkadot.subscan.io/nft_item/158-2407162256",
    ])
  })

  it("links Subscan only for the Nfts pallet on the networks Subscan indexes", () => {
    expect(
      toSubstrateAccountNft({ ...PAH_NFT, pallet: "Uniques" }, OWNER, null, null)
    ).toMatchObject({
      id: "substrate:polkadot-asset-hub:Uniques:158:2407162256",
      marketplaceUrls: [],
    })
    expect(
      toSubstrateAccountNft({ ...PAH_NFT, networkId: "paseo-asset-hub" }, OWNER, null, null)
        .marketplaceUrls
    ).toEqual([])
  })
})

describe("toSubstrateNftCollection", () => {
  it("maps the JSON metadata of a collection", () => {
    expect(
      toSubstrateNftCollection(PAH_NFT, {
        name: "Chaotic",
        description: "Collection",
        image: CID,
        external_url: "https://chaotic.art",
      })
    ).toEqual({
      id: "substrate:polkadot-asset-hub:Nfts:158",
      name: "Chaotic",
      description: "Collection",
      iconUrl: `${IPFS_GATEWAY}${CID}`,
      bannerUrl: `${IPFS_GATEWAY}${CID}`,
      itemsCount: null,
      ownersCount: null,
      marketplaceUrls: [
        "https://assethub-polkadot.subscan.io/nft_collection/158",
        "https://chaotic.art",
      ],
    })
  })

  it("falls back to the collection id without JSON metadata", () => {
    expect(toSubstrateNftCollection({ ...PAH_NFT, networkId: "kusama-asset-hub" }, null)).toEqual({
      id: "substrate:kusama-asset-hub:Nfts:158",
      name: "Collection 158",
      description: "",
      iconUrl: null,
      bannerUrl: null,
      itemsCount: null,
      ownersCount: null,
      marketplaceUrls: ["https://assethub-kusama.subscan.io/nft_collection/158"],
    })
  })
})
