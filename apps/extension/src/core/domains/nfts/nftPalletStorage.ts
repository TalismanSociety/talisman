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

type ParsedMetadata = ReturnType<typeof parseMetadataRpc>
type StorageCodec = ReturnType<ParsedMetadata["builder"]["buildStorage"]>

export type NftPalletStorage = {
  pallet: NftPalletName
  account: StorageCodec
  itemMetadata: StorageCodec
  collectionMetadata: StorageCodec
}

export type OwnedNftItem = { collection: number; item: number }

const hasStorageEntries = ({ unifiedMetadata }: ParsedMetadata, pallet: NftPallet) => {
  const entries = unifiedMetadata.pallets.find(({ name }) => name === pallet.name)?.storage?.items
  return [pallet.accountEntry, pallet.itemMetadataEntry, pallet.collectionMetadataEntry].every(
    (entry) => entries?.some(({ name }) => name === entry)
  )
}

export const buildNftPalletStorage = (
  parsed: ParsedMetadata,
  pallet: NftPallet
): NftPalletStorage | null => {
  if (!hasStorageEntries(parsed, pallet)) return null
  const { builder } = parsed
  return {
    pallet: pallet.name,
    account: builder.buildStorage(pallet.name, pallet.accountEntry),
    itemMetadata: builder.buildStorage(pallet.name, pallet.itemMetadataEntry),
    collectionMetadata: builder.buildStorage(pallet.name, pallet.collectionMetadataEntry),
  }
}

export const buildNftPalletStorages = (metadataRpc: `0x${string}`): NftPalletStorage[] => {
  const parsed = parseMetadataRpc(metadataRpc)
  return NFT_PALLETS.flatMap((pallet) => buildNftPalletStorage(parsed, pallet) ?? [])
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
