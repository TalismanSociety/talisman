import { ExtensionHandler } from "@core/libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port } from "@core/types/base"

export default class PGPHandler extends ExtensionHandler {

  // TODO-pgp: handle getters and subscriptions to pgp requests
  // TODO-pgp: handle responses to pgp requests

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    return null
  }
}
