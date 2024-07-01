import { ExtensionHandler } from "../../libs/Handler"
import { chainConnector } from "../../rpcs/chain-connector"
import { MessageHandler, MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { getMetadataDef } from "../../util/getMetadataDef"

export class SubHandler extends ExtensionHandler {
  private send: MessageHandler<"pri(substrate.rpc.send)"> = ({
    chainId,
    method,
    params,
    isCacheable,
  }) => {
    return chainConnector.send(chainId, method, params, isCacheable)
  }

  private metadata: MessageHandler<"pri(substrate.metadata.get)"> = ({
    genesisHash,
    specVersion,
    blockHash,
  }) => {
    return getMetadataDef(genesisHash, specVersion, blockHash)
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // substrate RPC handlers -----------------------------
      // --------------------------------------------------------------------
      case "pri(substrate.rpc.send)":
        return this.send(request as RequestTypes["pri(substrate.rpc.send)"])

      // --------------------------------------------------------------------
      // substrate chain metadata -----------------------------
      // --------------------------------------------------------------------
      case "pri(substrate.metadata.get)":
        return this.metadata(request as RequestTypes["pri(substrate.metadata.get)"])
    }
    throw new Error(`Unable to handle message of type ${type} (substrate)`)
  }
}
