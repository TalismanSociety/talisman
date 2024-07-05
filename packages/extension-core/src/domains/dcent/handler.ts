import DcentWebConnector from "dcent-web-connector"

import { ExtensionHandler } from "../../libs/Handler"
import type { MessageTypes, RequestType, ResponseType } from "../../types"

export class DcentHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(dcent.proxy)": {
        const dcentRequest = request as RequestType<"pri(dcent.proxy)">
        const methodName = dcentRequest[0]
        const methodArgs = dcentRequest.splice(1)
        try {
          return await DcentWebConnector[methodName](...methodArgs)
        } catch (err) {
          // the error will be an object formatted in a way the frontend expects
          return err
        }
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
