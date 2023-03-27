import { ExtensionHandler } from "@core/libs/Handler"
import { RequestSignatures, RequestTypes, ResponseType } from "@core/types"
import { Port } from "@core/types/base"

export default class RecentTransactionsHandler extends ExtensionHandler {
  handle<TMessageType extends keyof RequestSignatures>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(transaction.delete)":
        throw new Error("Not implemented")

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
