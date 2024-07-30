import { createSubscription, unsubscribe } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import {
  MessageHandler,
  MessageTypes,
  RequestTypes,
  ResponseType,
  SubscriptionHandler,
} from "../../types"
import {
  refreshNftMetadata,
  setFavoriteNft,
  setHiddenNftCollection,
  subscribeNfts,
} from "./service"

const handleSubscribeNfts: SubscriptionHandler<"pri(nfts.subscribe)"> = (id, port) => {
  const cb = createSubscription(id, port)

  const unsubscribeNfts = subscribeNfts(cb)

  // TODO cooldown: handle unsubscribe properly, our subscription model only allows unsubscribing when port closes
  port.onDisconnect.addListener((): void => {
    unsubscribe(id)
    unsubscribeNfts()
  })

  return true
}

const handleSetHiddenNftCollection: MessageHandler<"pri(nfts.collection.setHidden)"> = (
  request
) => {
  const { id, isHidden } = request
  setHiddenNftCollection(id, isHidden)
  return true
}

const handleSetFavoriteNft: MessageHandler<"pri(nfts.setFavorite)"> = (request) => {
  const { id, isFavorite } = request
  setFavoriteNft(id, isFavorite)
  return true
}

const handleRefreshNftMetadata: MessageHandler<"pri(nfts.refreshMetadata)"> = async (request) => {
  const { id } = request
  await refreshNftMetadata(id)
  return true
}

// TODO cooldown: change handle method arg list to an object so we can use type as discriminant and don't have to cast request & response
export class NftsHandler extends ExtensionHandler {
  public async handle<
    Type extends MessageTypes,
    Request = RequestTypes[Type],
    Response = ResponseType<Type>
  >(id: string, type: Type, request: Request, port: chrome.runtime.Port): Promise<Response> {
    switch (type) {
      case "pri(nfts.subscribe)":
        return handleSubscribeNfts(
          id,
          port,
          request as RequestTypes["pri(nfts.subscribe)"]
        ) as Response

      case "pri(nfts.collection.setHidden)":
        return handleSetHiddenNftCollection(
          request as RequestTypes["pri(nfts.collection.setHidden)"]
        ) as Response

      case "pri(nfts.setFavorite)":
        return handleSetFavoriteNft(request as RequestTypes["pri(nfts.setFavorite)"]) as Response

      case "pri(nfts.refreshMetadata)":
        return handleRefreshNftMetadata(
          request as RequestTypes["pri(nfts.refreshMetadata)"]
        ) as Response

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
