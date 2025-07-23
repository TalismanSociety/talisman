import { TabsHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { requestSolanaSignIn } from "../sitesAuthorised/requests"

export class SolanaTabsHandler extends TabsHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
    url: string,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // substrate RPC handlers -----------------------------
      // --------------------------------------------------------------------
      case "pub(solana.provider.signIn)": {
        return requestSolanaSignIn(
          request as RequestTypes["pub(solana.provider.signIn)"],
          url,
          port,
        )
      }
    }

    throw new Error(`Unable to handle message of type ${type}`)
  }
}
