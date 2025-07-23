import { isSolanaAddress } from "@talismn/crypto"

import { TabsHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType, TabMessageHandler } from "../../types"
import { Port } from "../../types/base"
import { keyringStore } from "../keyring/store"
import { requestAuthoriseSite, requestSolanaSignIn } from "../sitesAuthorised/requests"
import sitesAuthorisedStore from "../sitesAuthorised/store"

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

      case "pub(solana.provider.connect)": {
        return handleSolanaConnect(
          request as RequestTypes["pub(solana.provider.connect)"],
          url,
          port,
        )
      }
    }

    throw new Error(`Unable to handle message of type ${type}`)
  }
}

const handleSolanaConnect: TabMessageHandler<"pub(solana.provider.connect)"> = async (
  request,
  url,
  port,
) => {
  const site = await sitesAuthorisedStore.getSiteFromUrl(url)

  if (!site?.solAddresses?.length || !(await keyringStore.getAccount(site.solAddresses[0]))) {
    await requestAuthoriseSite(
      url,
      {
        origin: "",
        provider: "solana",
      },
      port,
    )
  }

  const updatedSite = await sitesAuthorisedStore.getSiteFromUrl(url)
  if (!updatedSite?.solAddresses?.length) throw new Error("Site has not been")

  const account = await keyringStore.getAccount(updatedSite.solAddresses[0])
  if (account && isSolanaAddress(account.address)) return { address: account.address }

  throw new Error("Unauthorized")
}
