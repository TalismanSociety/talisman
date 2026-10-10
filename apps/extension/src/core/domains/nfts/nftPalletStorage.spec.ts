import { encodeAddressSs58 } from "@talismn/crypto"
import { parseMetadataRpc, toHex } from "@talismn/scale"
import { describe, expect, it } from "vitest"

import { PAH_HOLDER, PAH_HOLDER_RPC, PAH_METADATA_RPC } from "./__fixtures__/pahHolder"
import {
  buildNftPalletStorage,
  buildNftPalletStorages,
  decodeMetadataUri,
  decodeOwnedItemKey,
  getCollectionMetadataKey,
  getItemMetadataKey,
  getOwnedItemsKeyPrefix,
  NFT_PALLETS,
} from "./nftPalletStorage"

const ownedNftsKeys = PAH_HOLDER_RPC.nftsOwnedKeys.keys
const storedValues = new Map<string, `0x${string}` | null>(PAH_HOLDER_RPC.storageAt.changes)

const readU32Le = (hex: string) => Buffer.from(hex, "hex").readUInt32LE(0)

const storages = buildNftPalletStorages(PAH_METADATA_RPC)
const getStorage = (pallet: "Nfts" | "Uniques") => {
  const storage = storages.find((s) => s.pallet === pallet)
  if (!storage) throw new Error(`${pallet} storage missing`)
  return storage
}

describe("nftPalletStorage", () => {
  it("builds both pallets from Asset Hub metadata", () => {
    expect(storages.map((s) => s.pallet)).toEqual(["Nfts", "Uniques"])
  })

  it("skips a pallet whose storage entry is not in the metadata", () => {
    const { builder } = parseMetadataRpc(PAH_METADATA_RPC)
    expect(buildNftPalletStorage(builder, { ...NFT_PALLETS[0], accountEntry: "Nope" })).toBeNull()
  })

  it("encodes the owner prefix the node was queried with", () => {
    expect(getOwnedItemsKeyPrefix(getStorage("Nfts"), PAH_HOLDER)).toBe(
      PAH_HOLDER_RPC.nftsOwnedKeys.prefix
    )
    expect(getOwnedItemsKeyPrefix(getStorage("Uniques"), PAH_HOLDER)).toBe(
      PAH_HOLDER_RPC.uniquesOwnedKeys.prefix
    )
  })

  it("encodes the same owner prefix from a generic substrate address", () => {
    expect(getOwnedItemsKeyPrefix(getStorage("Nfts"), encodeAddressSs58(PAH_HOLDER, 42))).toBe(
      PAH_HOLDER_RPC.nftsOwnedKeys.prefix
    )
  })

  it("decodes owned keys to the collection and item at the end of the key", () => {
    const storage = getStorage("Nfts")
    const decoded = ownedNftsKeys.map((key) => decodeOwnedItemKey(storage, key))

    expect(decoded).toHaveLength(15)
    for (const [index, key] of ownedNftsKeys.entries()) {
      // Blake2_128Concat(collection: u32) then Blake2_128Concat(item: u32)
      expect(decoded[index]).toEqual({
        collection: readU32Le(key.slice(-48, -40)),
        item: readU32Le(key.slice(-8)),
      })
    }
    expect(decoded).toContainEqual({ collection: 158, item: 2407162256 })
  })

  it("decodes item and collection metadata values to their URI", () => {
    const storage = getStorage("Nfts")
    const itemValue = storedValues.get(
      getItemMetadataKey(storage, { collection: 158, item: 2407162256 })
    )
    const collectionValue = storedValues.get(getCollectionMetadataKey(storage, 158))

    expect(decodeMetadataUri(storage.itemMetadata, itemValue ?? null)).toBe(
      "https://dyndata.chaotic.art/v1/metadata/ahp/158/2407162256"
    )
    expect(decodeMetadataUri(storage.collectionMetadata, collectionValue ?? null)).toBe(
      "ipfs://bafkreicgj674v7yqduga6angw3d4cvrlnfrgqp2grt53sq64gnpvodjepu"
    )
  })

  it("reads no URI from an empty storage value", () => {
    expect(decodeMetadataUri(getStorage("Uniques").itemMetadata, null)).toBeNull()
  })

  it("keeps the decoded value shapes this module relies on", () => {
    const nfts = getStorage("Nfts")
    const uniques = getStorage("Uniques")
    const itemValue = storedValues.get(
      getItemMetadataKey(nfts, { collection: 158, item: 2407162256 })
    )
    if (!itemValue) throw new Error("fixture value missing")

    expect(nfts.itemMetadata.value.dec(itemValue)).toEqual({
      deposit: { account: undefined, amount: expect.any(BigInt) },
      data: expect.any(Uint8Array),
    })
    const uniquesValue = toHex(
      uniques.itemMetadata.value.enc({
        deposit: 1n,
        data: new TextEncoder().encode("ipfs://x"),
        is_frozen: false,
      })
    )
    expect(uniques.itemMetadata.value.dec(uniquesValue)).toEqual({
      deposit: 1n,
      data: new TextEncoder().encode("ipfs://x"),
      is_frozen: false,
    })
    expect(decodeMetadataUri(uniques.itemMetadata, uniquesValue)).toBe("ipfs://x")
  })
})
