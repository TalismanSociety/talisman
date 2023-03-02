import { db } from "@core/db"
import { RequestMetadataApprove, RequestMetadataReject } from "@core/domains/metadata/types"
import { ExtensionHandler } from "@core/libs/Handler"
import { requestStore } from "@core/libs/requests/store"
import type { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port } from "@core/types/base"
import { assert } from "@polkadot/util"

import { metadataUpdatesStore } from "./metadataUpdates"

export default class MetadataHandler extends ExtensionHandler {
  private async metadataApprove({ id }: RequestMetadataApprove): Promise<boolean> {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { request, resolve } = queued

    // NOTE: If this throws, errors are handled in the UI (we show a nice error message toast to the user)
    // For more info check out @ui/apps/popup/pages/Metadata.tsx
    await db.metadata.put(request)

    resolve(true)

    return true
  }

  private metadataReject({ id }: RequestMetadataReject): boolean {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject } = queued

    reject(new Error("Rejected"))

    return true
  }

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
      case "pri(metadata.approve)":
        return await this.metadataApprove(request as RequestMetadataApprove)

      case "pri(metadata.reject)":
        return this.metadataReject(request as RequestMetadataReject)

      case "pri(metadata.requests)":
        return requestStore.subscribe<"pri(metadata.requests)">(id, port, ["metadata"])

      case "pri(metadata.updates.subscribe)": {
        const { id: genesisHash } = request as RequestTypes["pri(metadata.updates.subscribe)"]
        return metadataUpdatesStore.subscribe(id, port, genesisHash)
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
