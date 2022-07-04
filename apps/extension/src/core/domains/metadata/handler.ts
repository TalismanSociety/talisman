import { db } from "@core/libs/db"
import { ExtensionHandler } from "@core/libs/Handler"
import type {
  MessageTypes,
  RequestMetadataApprove,
  RequestMetadataReject,
  RequestTypes,
  ResponseType,
} from "@core/types"
import { Port } from "@core/types/base"
import { assert } from "@polkadot/util"

export default class MetadataHandler extends ExtensionHandler {
  private async metadataApprove({ id }: RequestMetadataApprove): Promise<boolean> {
    const queued = this.state.requestStores.metadata.getRequest(id)

    assert(queued, "Unable to find request")

    const { request, resolve } = queued

    await db.metadata.put(request)

    resolve(true)

    return true
  }

  private metadataReject({ id }: RequestMetadataReject): boolean {
    const queued = this.state.requestStores.metadata.getRequest(id)

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
        return this.state.requestStores.metadata.subscribe<"pri(metadata.requests)">(id, port)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
