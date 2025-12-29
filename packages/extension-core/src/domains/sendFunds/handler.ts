import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { addConfirmedAddress, confirmedAddresses$ } from "./store.confirmedAddresses"

export class SendFundsHandler extends ExtensionHandler {
  public async handle<
    Type extends MessageTypes,
    Request = RequestTypes[Type],
    Response = ResponseType<Type>,
  >(id: string, type: Type, request: Request, port: chrome.runtime.Port): Promise<Response> {
    switch (type) {
      case "pri(sendFunds.confirmedAddresses.subscribe)":
        return genericSubscription(id, port, confirmedAddresses$) as Response

      case "pri(sendFunds.confirmedAddresses.add)": {
        const { tokenId, address } =
          request as RequestTypes["pri(sendFunds.confirmedAddresses.add)"]
        await addConfirmedAddress(tokenId, address)
        return true as Response
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
