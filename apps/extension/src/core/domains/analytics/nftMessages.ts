import type { MessageTypes, RequestTypes } from "../../types"
import { track } from "./track"

type NftMessage =
  | "pri(nfts.collection.setHidden)"
  | "pri(nfts.setFavorite)"
  | "pri(nfts.refreshMetadata)"

type Observe<M extends NftMessage> = (request: RequestTypes[M]) => () => Promise<void>

const NFT_MESSAGES: { [M in NftMessage]: Observe<M> } = {
  "pri(nfts.collection.setHidden)":
    ({ isHidden }) =>
    async () =>
      track("nft_collection_hidden_toggled", { hidden: isHidden }),
  "pri(nfts.setFavorite)":
    ({ isFavorite }) =>
    async () =>
      track("nft_favourite_toggled", { favourite: isFavorite }),
  "pri(nfts.refreshMetadata)": () => async () => track("nft_metadata_refreshed"),
}

const isNftMessage = (type: MessageTypes): type is NftMessage => Object.hasOwn(NFT_MESSAGES, type)

/** Null when the message is not an NFT change. */
export const observeNftMessage = (
  type: MessageTypes,
  request: unknown
): (() => Promise<void>) | null => {
  if (!isNftMessage(type)) return null
  // each entry only ever receives its own message's request
  const observe = NFT_MESSAGES[type] as unknown as (request: unknown) => () => Promise<void>
  return observe(request)
}
