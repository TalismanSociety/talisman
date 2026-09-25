import { ExtensionHandler } from "../../libs/Handler"
import type { MessageTypes, RequestType, RequestTypes, ResponseType } from "../../types"
import type { Port } from "../../types/base"
import { metadataUpdatesStore } from "./metadataUpdates"

export default class MetadataHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    // Then try remaining which are present in this class
    switch (type) {
      // --------------------------------------------------------------------
      // metadata handlers --------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(metadata.updates.subscribe)": {
        const { id: genesisHash } = request as RequestType<"pri(metadata.updates.subscribe)">
        return metadataUpdatesStore.subscribe(id, port, genesisHash)
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
