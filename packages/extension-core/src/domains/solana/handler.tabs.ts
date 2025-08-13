import { isSolanaAddress } from "@talismn/crypto"
import { getTalismanOrbDataUrl } from "@talismn/orb"
import { deserializeTransaction, parseTransactionInfo } from "@talismn/solana"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { distinctUntilChanged, map, of, switchMap } from "rxjs"

import { TabsHandler } from "../../libs/Handler"
import {
  MessageTypes,
  RequestTypes,
  ResponseType,
  TabMessageHandler,
  TabSubscriptionHandler,
} from "../../types"
import { Port } from "../../types/base"
import { urlToDomain } from "../../util/urlToDomain"
import { keyringStore } from "../keyring/store"
import { signSolana } from "../signing/requests"
import { SolSignRequest, SolSignResult } from "../signing/types"
import { requestAuthoriseSite, requestSolanaSignIn } from "../sitesAuthorised/requests"
import sitesAuthorisedStore from "../sitesAuthorised/store"
import { AuthorizedSite } from "../sitesAuthorised/types"
import { watchSolanaTransaction } from "../transactions/watchSolanaTransaction"
import { SolanaTabSubscriptionEvent, SolSerializedWalletAccount } from "./types.tabs"

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
        return handleSolanaSubscribe(
          id,
          url,
          port,
          request as RequestTypes["pub(solana.provider.subscribe)"],
        )
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

      case "pub(solana.provider.signMessage)": {
        return handleSolanaSignMessage(
          request as RequestTypes["pub(solana.provider.signMessage)"],
          url,
          port,
        )
      }

      case "pub(solana.provider.signTransaction)": {
        return handleSolanaSignTransaction(
          request as RequestTypes["pub(solana.provider.signTransaction)"],
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

  // onlyIfTrusted is used for dapps that want to auto-reconnect after first connection
  // if that flag is set, then it should not trigger an authorisation request

  if (!request.onlyIfTrusted)
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
  if (!updatedSite?.solAddresses?.length) throw new Error("Unauthorized")

  const account = await keyringStore.getAccount(updatedSite.solAddresses[0])
  if (account && isSolanaAddress(account.address))
    return {
      account: {
        address: account.address,
        label: account.name,
        icon: getTalismanOrbDataUrl(account.address),
      },
    }

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

const handleSolanaSignMessage: TabMessageHandler<"pub(solana.provider.signMessage)"> = async (
  { address, message },
  url,
  port,
) => {
  const site = await sitesAuthorisedStore.getSiteFromUrl(url)
  if (!site?.solAddresses?.includes(address)) throw new Error("Unauthorized")

  const account = await keyringStore.getAccount(address)
  if (!account) throw new Error("Account not found")

  const request: SolSignRequest = {
    type: "message",
    message,
  }

  const result = (await signSolana(url, port, account, request)) as SolSignResult

  if (result.type !== "message")
    throw new Error("Unexpected response type from Solana sign request")

  return {
    signature: result.signature,
  }
}

const handleSolanaSignTransaction: TabMessageHandler<
  "pub(solana.provider.signTransaction)"
> = async ({ send, transaction, chain, options }, url, port) => {
  log.debug("handleSolanaSignTransaction", { url, port, transaction, chain, options })
  const site = await sitesAuthorisedStore.getSiteFromUrl(url)
  const tx = deserializeTransaction(transaction)
  const { address = site.solAddresses?.[0] } = parseTransactionInfo(tx)

  if (!address || !site?.solAddresses?.includes(address)) throw new Error("Unauthorized")

  const account = await keyringStore.getAccount(address)
  if (!account) throw new Error("Account not found")

  const request: SolSignRequest = {
    type: "transaction",
    transaction,
    send,
  }

  const result = (await signSolana(url, port, account, request)) as SolSignResult

  if (result.type !== "transaction")
    throw new Error("Unexpected response type from Solana sign request")

  if (result.networkId)
    watchSolanaTransaction(result.networkId, deserializeTransaction(result.transaction), {
      siteUrl: url,
      notifications: true,
    })

  return {
    transaction: result.transaction,
  }
}

const handleSolanaSubscribe: TabSubscriptionHandler<"pub(solana.provider.subscribe)"> = async (
  id,
  url,
  port,
) => {
  const resSiteId = urlToDomain(url)
  const siteId = resSiteId.unwrap()

  let prevAccount: SolSerializedWalletAccount | null = null

  const sub = getAuthorizedSolanaAccount$(siteId).subscribe((account) => {
    // event to send to the tab
    const ev = ((): SolanaTabSubscriptionEvent | null => {
      if (account) {
        return prevAccount ? { type: "accountChanged", account } : { type: "connect", account }
      } else if (prevAccount) {
        return { type: "disconnect" }
      } else return null
    })()

    prevAccount = account

    if (ev) {
      try {
        port.postMessage({
          id,
          subscription: ev,
        })
      } catch (err) {
        log.error("Error in SolanaTabsHandler subscription", err)
        return sub.unsubscribe()
      }
    }
  })

  return true
}

const getAuthorizedSolanaAccount$ = (siteId: string) => {
  return sitesAuthorisedStore.observable.pipe(
    map((sites) => sites[siteId]),
    distinctUntilChanged<AuthorizedSite>(isEqual),
    map((site) => site?.solAddresses?.[0]),
    distinctUntilChanged<string | undefined>(isEqual),
    switchMap((address) => (address ? keyringStore.getAccount(address) : of(null))),
    map((account): SolSerializedWalletAccount | null =>
      account
        ? {
            address: account.address,
            label: account.name,
            icon: getTalismanOrbDataUrl(account.address),
          }
        : null,
    ),
    distinctUntilChanged<SolSerializedWalletAccount | null>(isEqual),
  )
}
