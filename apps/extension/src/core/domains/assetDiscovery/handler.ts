import { ExtensionHandler } from "../../libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { assetDiscoveryScanner } from "./scanner"
import type { AssetDiscoveryScanScope } from "./types"

export class AssetDiscoveryHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    _id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType]
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(assetDiscovery.scan.start)":
        return assetDiscoveryScanner.startScan(request as AssetDiscoveryScanScope, true)

      case "pri(assetDiscovery.scan.stop)":
        return assetDiscoveryScanner.stopScan()

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
