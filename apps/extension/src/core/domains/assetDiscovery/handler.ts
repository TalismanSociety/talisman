import { ExtensionHandler } from "@core/libs/Handler"
import { updateAndWaitForUpdatedChaindata } from "@core/rpcs/mini-metadata-updater"
import { MessageTypes, RequestTypes, ResponseType } from "core/types"

import { assetDiscoveryScanner } from "./scanner"
import { RequestAssetDiscoveryStartScan } from "./types"

export class AssetDiscoveryHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType]
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(assetDiscovery.scan.start)":
        await updateAndWaitForUpdatedChaindata()
        return assetDiscoveryScanner.startScan(request as RequestAssetDiscoveryStartScan)

      case "pri(assetDiscovery.scan.stop)":
        return assetDiscoveryScanner.stopScan()

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
