import type { ExtensionHandler } from "@core/libs/Handler"
import type { MessageTypes, RequestType, ResponseType } from "@core/types"
import { v4 } from "uuid"

export const getMessageSenderFn =
  (extension: ExtensionHandler, port: chrome.runtime.Port = {} as chrome.runtime.Port) =>
  <M extends MessageTypes>(
    messageType: M,
    request: RequestType<M> = null,
    id = v4()
  ): Promise<ResponseType<M>> =>
    extension.handle(id, messageType, request, port)
