import { createSubscription, unsubscribe } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType, SubscriptionHandler } from "../../types"
import { Port } from "../../types/base"
import { subscribeNfts } from "./service"

// TODO cooldown: allow handlers to return synchronously (impacts all handlers signatures)
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

// TODO cooldown: change handle method arg list to an object so we can use type as discriminant and don't have to cast request & response
export class NftsHandler extends ExtensionHandler {
  public async handle<
    Type extends MessageTypes,
    Request = RequestTypes[Type],
    Response = ResponseType<Type>
  >(id: string, type: Type, request: Request, port: Port): Promise<Response> {
    switch (type) {
      case "pri(nfts.subscribe)":
        return handleSubscribeNfts(
          id,
          port,
          request as RequestTypes["pri(nfts.subscribe)"]
        ) as Response

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
