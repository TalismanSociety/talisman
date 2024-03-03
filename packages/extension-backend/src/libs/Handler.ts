import { ExtensionStore, Store, TabStore } from "../handlers/stores"
import type { MessageTypes, RequestSignatures, RequestType, ResponseType } from "../types"
import type { Port } from "../types/base"

interface THandler {
  handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port,
    url?: string
  ): Promise<ResponseType<TMessageType>>
}

abstract class BaseHandler<TStore extends Store> implements THandler {
  #stores: TStore

  constructor(stores: TStore) {
    this.#stores = stores
  }

  protected get stores() {
    return this.#stores
  }

  abstract handle<TMessageType extends keyof RequestSignatures>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port,
    url?: string
  ): Promise<ResponseType<TMessageType>>
}

export abstract class TabsHandler extends BaseHandler<TabStore> {
  abstract handle<TMessageType extends keyof RequestSignatures>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port,
    url: string
  ): Promise<ResponseType<TMessageType>>
}

export abstract class ExtensionHandler extends BaseHandler<ExtensionStore> {
  /*
  // This handler should be used on the extension side only, because it
  // provides access to the passowrd store which contains sensitive data.
  */
  abstract handle<TMessageType extends keyof RequestSignatures>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port
  ): Promise<ResponseType<TMessageType>>
}
