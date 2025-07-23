import { isSolanaAddress } from "@talismn/crypto"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { distinctUntilChanged, map, skip } from "rxjs"

import { TabsHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType, TabMessageHandler } from "../../types"
import { Port } from "../../types/base"
import { urlToDomain } from "../../util/urlToDomain"
import { keyringStore } from "../keyring/store"
import { requestAuthoriseSite, requestSolanaSignIn } from "../sitesAuthorised/requests"
import sitesAuthorisedStore from "../sitesAuthorised/store"
import { AuthorizedSite } from "../sitesAuthorised/types"
import { SolanaTabSubscriptionEvent } from "./types.tabs"

export class SolanaTabsHandler extends TabsHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
    url: string,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pub(solana.provider.subscribe)": {
        const resSiteId = urlToDomain(url)
        const siteId = resSiteId.unwrap()

        const site$ = sitesAuthorisedStore.observable.pipe(
          map((sites) => sites[siteId]),
          distinctUntilChanged<AuthorizedSite>(isEqual),
        )

        let previousAddresses: string[] = []

        const sub = site$
          .pipe(
            map((site) => site?.solAddresses ?? []),
            skip(1),
            distinctUntilChanged<string[]>(isEqual),
          )
          .subscribe((addresses) => {
            const ev = ((): SolanaTabSubscriptionEvent | null => {
              if (!previousAddresses.length && addresses.length)
                return {
                  type: "connect",
                  address: addresses[0],
                }
              else if (previousAddresses.length && !addresses.length)
                return {
                  type: "disconnect",
                }
              else if (
                previousAddresses.length &&
                addresses.length &&
                !isEqual(previousAddresses, addresses)
              )
                return {
                  type: "accountChanged",
                  address: addresses[0],
                }
              return null
            })()

            previousAddresses = addresses

            if (!ev) return

            try {
              port.postMessage({
                id,
                subscription: ev,
              })
            } catch (err) {
              log.error("Error in SolanaTabsHandler subscription", err)
              return sub.unsubscribe()
            }
          })

        return true
      }

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

      case "pub(solana.provider.disconnect)": {
        return handleSolanaDisconnect(
          request as RequestTypes["pub(solana.provider.disconnect)"],
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

const handleSolanaDisconnect: TabMessageHandler<"pub(solana.provider.disconnect)"> = async (
  request,
  url,
) => {
  const site = await sitesAuthorisedStore.getSiteFromUrl(url)

  if (site?.solAddresses?.length)
    sitesAuthorisedStore.updateSite(site.id, {
      solAddresses: [],
    })
}
