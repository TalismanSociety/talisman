import { ExtensionHandler } from "../../libs/Handler"
import { chainConnectorSol } from "../../rpcs/chain-connector-sol"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"

export class SolanaExtensionHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    // port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // substrate RPC handlers -----------------------------
      // --------------------------------------------------------------------
      case "pri(solana.rpc.send)": {
        const { networkId, request: req } = request as RequestTypes["pri(solana.rpc.send)"]
        const connection = await chainConnectorSol.getConnection(networkId)

        // TODO error handling
        return (
          connection as unknown as { _rpcRequest: (method: string, params: unknown[]) => unknown }
        )._rpcRequest(req.method, req.params)
      }
    }
    throw new Error(`Unable to handle message of type ${type} (substrate)`)
  }
}
