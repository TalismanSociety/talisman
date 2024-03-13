// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Adapted from https://github.com/polkadot-js/extension/

import { log } from "extension-shared"

import {
  ETH_ERROR_EIP1474_INTERNAL_ERROR,
  WrappedEthProviderRpcError,
} from "../domains/ethereum/EthProviderRpcError"
import type {
  MessageTypes,
  MessageTypesWithNoSubscriptions,
  MessageTypesWithNullRequest,
  MessageTypesWithSubscriptions,
  OriginTypes,
  RequestTypes,
  ResponseTypes,
  SubscriptionMessageTypes,
  TransportRequestMessage,
  TransportResponseMessage,
  UnsubscribeFn,
} from "../types"
import type { Port } from "../types/base"

export interface Handler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (data?: any) => void
  reject: (error: Error) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscriber?: (data: any) => void
}

export type Handlers = Record<string, Handler>

type MessageServiceConstructorArgs = {
  origin: OriginTypes
  messageSource?: Port | Window
}

export default class MessageService {
  handlers: Handlers = {}
  idCounter = 0
  origin = "talisman-page"
  messageSource: Port | Window = window

  constructor({ origin, messageSource }: MessageServiceConstructorArgs) {
    if (origin === "talisman-extension" && !messageSource) {
      throw Error(
        "An instance of chrome.runtime.Port must be provided as 'messageSource' when used with extension as origin"
      )
    } else if (messageSource) {
      this.messageSource = messageSource
    }
    this.origin = origin
    this.handleResponse = this.handleResponse.bind(this)
    this.sendMessage = this.sendMessage.bind(this)
  }

  // a generic message sender that creates an event, returning a promise that will
  // resolve once the event is resolved (by the response listener just below this)
  sendMessage<TMessageType extends MessageTypesWithNullRequest>(
    message: TMessageType
  ): Promise<ResponseTypes[TMessageType]>
  sendMessage<TMessageType extends MessageTypesWithNoSubscriptions>(
    message: TMessageType,
    request: RequestTypes[TMessageType]
  ): Promise<ResponseTypes[TMessageType]>
  sendMessage<TMessageType extends MessageTypesWithSubscriptions>(
    message: TMessageType,
    request: RequestTypes[TMessageType],
    subscriber: (data: SubscriptionMessageTypes[TMessageType]) => void
  ): Promise<ResponseTypes[TMessageType]>

  sendMessage<TMessageType extends MessageTypes>(
    message: TMessageType,
    request?: RequestTypes[TMessageType],
    subscriber?: (data: unknown) => void
  ): Promise<ResponseTypes[TMessageType]> {
    return new Promise((resolve, reject): void => {
      const id = crypto.randomUUID()

      this.handlers[id] = {
        reject,
        resolve,
        subscriber,
      }
      const transportRequestMessage: TransportRequestMessage<TMessageType> = {
        id,
        message,
        origin: this.origin as OriginTypes,
        request: request || (null as RequestTypes[TMessageType]),
      }

      this.messageSource.postMessage(transportRequestMessage, window.location.origin)
    })
  }

  /**
   * Should be used for internal/private messages only
   */
  subscribe<TMessageType extends MessageTypesWithSubscriptions>(
    message: TMessageType,
    request: RequestTypes[TMessageType],
    subscriber: (data: SubscriptionMessageTypes[TMessageType]) => void
  ): UnsubscribeFn {
    const id = crypto.randomUUID()

    // mock the promise resolve/reject methods
    this.handlers[id] = {
      reject: (error) => {
        log.error("subscription failed", { message, error })
      },
      resolve: () => {},
      subscriber,
    }
    const transportRequestMessage: TransportRequestMessage<TMessageType> = {
      id,
      message,
      origin: this.origin as OriginTypes,
      request: request || (null as RequestTypes[TMessageType]),
    }

    this.messageSource.postMessage(transportRequestMessage, window.location.origin)

    return () => {
      this.sendMessage("pri(unsubscribe)", { id }).then(() => delete this.handlers[id])
    }
  }

  handleResponse<TMessageType extends MessageTypes>(
    data: TransportResponseMessage<TMessageType> & {
      subscription?: string
      code?: number
      rpcData?: unknown
      isEthProviderRpcError?: boolean
    }
  ): void {
    const handler = this.handlers[data.id]

    if (!handler) {
      const { id, error } = data // don't print all properties, this could log sensitive data
      log.error("No handler for message: ", { id, error })

      return
    }

    if (!handler.subscriber) {
      delete this.handlers[data.id]
    }

    // lost 4 hours on this, a warning would have helped :)
    if (typeof data.subscription === "boolean")
      log.warn(
        "MessageService.handleResponse : subscription callback will not be called for falsy values, don't use booleans"
      )

    if (data.subscription && handler.subscriber) handler.subscriber(data.subscription)
    else if (data.error) {
      if (data.isEthProviderRpcError) {
        handler.reject(
          new WrappedEthProviderRpcError(
            data.error,
            data.code ?? ETH_ERROR_EIP1474_INTERNAL_ERROR,
            data.rpcData
          )
        )
      } else handler.reject(new Error(data.error))
    } else handler.resolve(data.response)
  }
}
