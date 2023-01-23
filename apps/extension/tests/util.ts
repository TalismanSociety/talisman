import { ExtensionHandler } from "@core/libs/Handler"
import { MessageTypes, RequestType, ResponseType } from "@core/types"
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { v4 } from "uuid"

export const getMessageSenderFn =
  (extension: ExtensionHandler) =>
  <M extends MessageTypes>(
    messageType: M,
    request: RequestType<M> = null,
    id = v4()
  ): Promise<ResponseType<M>> =>
    extension.handle(id, messageType, request, {} as chrome.runtime.Port)
