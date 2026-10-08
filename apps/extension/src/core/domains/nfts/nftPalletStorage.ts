import { fromHex, parseMetadataRpc } from "@talismn/scale"
import { isHexString } from "@talismn/util"

export type NftPalletName = "Nfts" | "Uniques"

export type NftPallet = {
  name: NftPalletName
  accountEntry: string
  itemMetadataEntry: string
  collectionMetadataEntry: string
}

export const NFT_PALLETS: NftPallet[] = [
  {
    name: "Nfts",
    accountEntry: "Account",
    itemMetadataEntry: "ItemMetadataOf",
    collectionMetadataEntry: "CollectionMetadataOf",
  },
  {
    name: "Uniques",
    accountEntry: "Account",
    itemMetadataEntry: "InstanceMetadataOf",
    collectionMetadataEntry: "ClassMetadataOf",
  },
]

type MetadataBuilder = ReturnType<typeof parseMetadataRpc>["builder"]
type StorageCodec = ReturnType<MetadataBuilder["buildStorage"]>

export type NftPalletStorage = {
  pallet: NftPalletName
  account: StorageCodec
  itemMetadata: StorageCodec
  collectionMetadata: StorageCodec
}

export type OwnedNftItem = { collection: number; item: number }

export const buildNftPalletStorage = (
  builder: MetadataBuilder,
  pallet: NftPallet
): NftPalletStorage | null => {
  try {
    return {
      pallet: pallet.name,
      account: builder.buildStorage(pallet.name, pallet.accountEntry),
      itemMetadata: builder.buildStorage(pallet.name, pallet.itemMetadataEntry),
      collectionMetadata: builder.buildStorage(pallet.name, pallet.collectionMetadataEntry),
    }
  } catch {
    // buildStorage throws when the pallet or entry is not in the runtime metadata
    return null
  }
}

export const buildNftPalletStorages = (metadataRpc: `0x${string}`): NftPalletStorage[] => {
  const { builder } = parseMetadataRpc(metadataRpc)
  return NFT_PALLETS.flatMap((pallet) => buildNftPalletStorage(builder, pallet) ?? [])
}

export const getOwnedItemsKeyPrefix = (storage: NftPalletStorage, address: string) =>
  storage.account.keys.enc(address)

export const decodeOwnedItemKey = (storage: NftPalletStorage, key: string): OwnedNftItem => {
  const [, collection, item] = storage.account.keys.dec(key)
  if (typeof collection !== "number" || typeof item !== "number")
    throw new Error(`Unexpected ${storage.pallet}.Account key shape`)
  return { collection, item }
}

export const getItemMetadataKey = (storage: NftPalletStorage, { collection, item }: OwnedNftItem) =>
  storage.itemMetadata.keys.enc(collection, item)

export const getCollectionMetadataKey = (storage: NftPalletStorage, collection: number) =>
  storage.collectionMetadata.keys.enc(collection)

export const decodeMetadataUri = (codec: StorageCodec, value: string | null) => {
  if (!value) return null
  const decoded: unknown = codec.value.dec(value)
  if (typeof decoded !== "object" || decoded === null || !("data" in decoded))
    throw new Error("Unexpected metadata value shape")
  return new TextDecoder().decode(toBytes(decoded.data))
}

const toBytes = (data: unknown): Uint8Array => {
  if (data instanceof Uint8Array) return data
  if (isHexString(data)) return fromHex(data)
  throw new Error("Unexpected metadata data shape")
}
