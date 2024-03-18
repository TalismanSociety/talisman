/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { v4 } from "uuid"
import { Runtime } from "webextension-polyfill"

import { ExtensionHandler } from "../src/libs/Handler"
import { MessageTypes, RequestType, ResponseType } from "../src/types"

export const getMessageSenderFn =
  (extension: ExtensionHandler, port: Runtime.Port = {} as Runtime.Port) =>
  <M extends MessageTypes>(
    messageType: M,
    request: RequestType<M> = null,
    id = v4()
  ): Promise<ResponseType<M>> =>
    extension.handle(id, messageType, request, port)
