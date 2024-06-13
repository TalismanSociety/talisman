/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { v4 } from "uuid"

import { ExtensionHandler } from "../src/libs/Handler"
import { MessageTypes, RequestType, ResponseType } from "../src/types"

export const getMessageSenderFn =
  (extension: ExtensionHandler, port: chrome.runtime.Port = {} as chrome.runtime.Port) =>
  <M extends MessageTypes>(
    messageType: M,
    request: RequestType<M> = null,
    id = v4()
  ): Promise<ResponseType<M>> =>
    extension.handle(id, messageType, request, port)
