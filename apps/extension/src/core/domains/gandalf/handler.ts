import { ExtensionHandler } from "../../libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { getAccessToken } from "./observable"

export class GandalfHandler extends ExtensionHandler {
  public async handle<
    Type extends MessageTypes,
    Request = RequestTypes[Type],
    Response = ResponseType<Type>,
  >(_id: string, type: Type, _request: Request, _port: chrome.runtime.Port): Promise<Response> {
    switch (type) {
      case "pri(gandalf.accessToken.get)":
        return (await getAccessToken()) as Response
      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
