import { isTalismanUrl } from "@core/util/isTalismanUrl"
import type { TabStore } from "../../../handlers/stores"
import { TabsHandler } from "../../../libs/Handler"
import { windowManager } from "../../../libs/WindowManager"
import type { MessageTypes, RequestTypes, ResponseType } from "../../../types"
import type { Port } from "../../../types/base"
import TalismanRpcHandler from "./rpc"

export default class TalismanHandler extends TabsHandler {
  readonly #subHandlers: readonly TabsHandler[]

  constructor(stores: TabStore) {
    super(stores)

    this.#subHandlers = [new TalismanRpcHandler(stores)]
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
    url: string
  ): Promise<ResponseType<TMessageType>> {
    // these methods are pub() because they're exposed to dapps,
    // BUT they're actually only exposed to dapps where isTalismanHostname is true
    // which is only app.talisman.xyz in production, and also localhost in dev
    if (!isTalismanUrl(url)) throw new Error(`Origin not allowed for message type ${type}`)

    switch (type) {
      case "pub(talisman.extension.openPortfolio)": {
        await windowManager.openDashboard({ route: "/portfolio" })
        return true
      }

      default:
        for (const handler of this.#subHandlers) {
          try {
            return handler.handle(id, type, request, port, url)
          } catch {}
        }
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
