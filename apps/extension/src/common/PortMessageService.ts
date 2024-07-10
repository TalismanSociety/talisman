// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Adapted from https://github.com/polkadot-js/extension/

import type {
  MessageTypes,
  MessageTypesWithNoSubscriptions,
  MessageTypesWithNullRequest,
  MessageTypesWithSubscriptions,
  OriginTypes,
  Port,
  RequestTypes,
  ResponseTypes,
  SubscriptionMessageTypes,
  TransportRequestMessage,
  TransportResponseMessage,
  UnsubscribeFn,
} from "@extension/core"
import { log } from "@extension/shared"
import { PORT_EXTENSION } from "@extension/shared"

import {
  ETH_ERROR_EIP1474_INTERNAL_ERROR,
  WrappedEthProviderRpcError,
} from "../inject/ethereum/EthProviderRpcError"

export interface Handler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (data?: any) => void
  reject: (error: Error) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscriber?: (data: any) => void
}

export type Handlers = Record<string, Handler>

export class PortMessageError extends Error {}

async function wakeupBackground(): Promise<Error | null> {
  try {
    await chrome.runtime.sendMessage({ type: "wakeup" })
    return null
  } catch (cause) {
    return cause instanceof Error ? cause : new Error(String(cause))
  }
}

export default class PortMessageService {
  handlers: Handlers = {}
  idCounter = 0
  origin = "talisman-extension"
  port: Port | undefined = undefined

  constructor() {
    this.handleResponse = this.handleResponse.bind(this)
    this.sendMessage = this.sendMessage.bind(this)
    this.createPort = this.createPort.bind(this)
  }

  createPort = async (maxAttempts = 5, delayMs = 1000): Promise<Port> => {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const error = await wakeupBackground()
      if (error) {
        lastError = error
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      this.port = chrome.runtime.connect({ name: PORT_EXTENSION })
      this.port.onMessage.addListener(this.handleResponse)
      this.port.onDisconnect.addListener(() => {
        this.port = undefined
      })

      return this.port
    }

    throw new Error("Failed to create port after multiple attempts", { cause: lastError })
  }

  private async ensurePortAndSendMessage<TMessageType extends MessageTypes>(
    message: TransportRequestMessage<TMessageType>
  ): Promise<void> {
    if (!this.port) await this.createPort()

    if (this.port) {
      this.port.postMessage(message)
    } else {
      throw new Error("Failed to create port")
    }
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
    return new Promise((resolve, reject) => {
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

      this.ensurePortAndSendMessage(transportRequestMessage)
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

    this.ensurePortAndSendMessage(transportRequestMessage)

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
        "PortMessageService.handleResponse : subscription callback will not be called for falsy values, don't use booleans"
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
