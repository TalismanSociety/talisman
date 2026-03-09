import { queryCacheStore } from "../../db/queryCache"
import { ExtensionHandler } from "../../libs/Handler"
import type { MessageHandler, MessageTypes, RequestTypes, ResponseType } from "../../types"

const handleGet: MessageHandler<"pri(queryCache.get)"> = ({ key }) => queryCacheStore.get(key)

const handleSet: MessageHandler<"pri(queryCache.set)"> = ({ key, data, purgeAt, dataUpdatedAt }) =>
  queryCacheStore.set(key, data, purgeAt, dataUpdatedAt)

const handleRemove: MessageHandler<"pri(queryCache.remove)"> = ({ key }) =>
  queryCacheStore.remove(key)

export class QueryCacheHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    _id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    _port: chrome.runtime.Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(queryCache.get)":
        return handleGet(
          request as RequestTypes["pri(queryCache.get)"]
        ) as ResponseType<TMessageType>

      case "pri(queryCache.set)":
        return handleSet(
          request as RequestTypes["pri(queryCache.set)"]
        ) as ResponseType<TMessageType>

      case "pri(queryCache.remove)":
        return handleRemove(
          request as RequestTypes["pri(queryCache.remove)"]
        ) as ResponseType<TMessageType>

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
