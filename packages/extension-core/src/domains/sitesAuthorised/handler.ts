import { assert } from "@polkadot/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { base58, ed25519 } from "@talismn/crypto"
import { Account } from "@talismn/keyring"

import type {
  MessageTypes,
  RequestType,
  RequestTypes,
  ResponseType,
  ResponseTypes,
} from "../../types"
import type { Port, RequestIdOnly } from "../../types/base"
import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { requestStore } from "../../libs/requests/store"
import { KnownRequestIdOnly } from "../../libs/requests/types"
import { keyringStore } from "../keyring/store"
import { withSecretKey } from "../keyring/withSecretKey"
import { ignoreRequest } from "./requests"
import {
  AuthorizedSite,
  AuthRequestApprove,
  RequestAuthorizedSiteBatchOp,
  RequestAuthorizedSiteForget,
  RequestAuthorizedSiteUpdate,
} from "./types"

export default class SitesAuthorisationHandler extends ExtensionHandler {
  private async authorizedForget({ id, type }: RequestAuthorizedSiteForget) {
    await this.stores.sites.forgetSite(id, type)
    return true
  }

  private async disconnectAll({ type }: RequestAuthorizedSiteBatchOp): Promise<boolean> {
    await this.stores.sites.disconnectAllSites(type)
    return true
  }

  private async forgetAll({ type }: RequestAuthorizedSiteBatchOp): Promise<boolean> {
    await this.stores.sites.forgetAllSites(type)
    return true
  }

  private async authorizedUpdate({ id, authorisedSite }: RequestAuthorizedSiteUpdate) {
    // un-set connectAllSubstrate if the user modifies the addresses for a site
    const updateConnectAll: Pick<AuthorizedSite, "connectAllSubstrate"> = {}
    if ("addresses" in authorisedSite) updateConnectAll["connectAllSubstrate"] = undefined
    await this.stores.sites.updateSite(id, { ...authorisedSite, ...updateConnectAll })
    talismanAnalytics.capture("authorised site update addresses", {
      url: id,
    })
    return true
  }

  private authorizeApprove({ id, addresses = [] }: AuthRequestApprove): boolean {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")

    talismanAnalytics.capture("authorised site approve", {
      url: queued.idStr,
      authType: queued.request.provider,
      withEthAccounts:
        queued.request.provider === "ethereum" ? undefined : addresses.some(isEthereumAddress),
    })
    const { resolve } = queued
    resolve({ addresses })

    return true
  }

  private authorizeReject({ id }: KnownRequestIdOnly<"auth">): boolean {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")

    const { reject } = queued
    talismanAnalytics.capture("authorised site reject", {
      url: queued.idStr,
      authType: queued.request.provider,
    })
    reject(new Error("Rejected"))

    return true
  }

  private async authorizeApproveSolSignIn({
    id,
    result,
  }: RequestTypes["pri(sites.requests.approveSolSignIn)"]): Promise<
    ResponseTypes["pri(sites.requests.approveSolSignIn)"]
  > {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")

    // if this throws, front end will catch it and display an error
    // => all inputs must be validated here
    const { account, signature } = await getSolSignInSignature(result)

    // resolve handler cannot send error back to the frontend
    queued.resolve({
      account,
      message: result.message,
      signature,
    })

    return true
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // authorized sites handlers ------------------------------------------
      // --------------------------------------------------------------------
      case "pri(sites.list)":
        return await this.stores.sites.get()

      case "pri(sites.byid)":
        return await this.stores.sites.get(id)

      case "pri(sites.subscribe)":
        return this.stores.sites.subscribe(id, port)

      case "pri(sites.byid.subscribe)":
        return this.stores.sites.subscribeById(id, port, request as RequestIdOnly)

      case "pri(sites.forget)":
        return this.authorizedForget(request as RequestAuthorizedSiteForget)

      case "pri(sites.update)":
        return this.authorizedUpdate(request as RequestAuthorizedSiteUpdate)

      case "pri(sites.disconnect.all)":
        return this.disconnectAll(request as RequestAuthorizedSiteBatchOp)

      case "pri(sites.forget.all)":
        return this.forgetAll(request as RequestAuthorizedSiteBatchOp)

      // --------------------------------------------------------------------
      // authorised site requests handlers ----------------------------------
      // --------------------------------------------------------------------
      case "pri(sites.requests.approve)":
        return this.authorizeApprove(request as AuthRequestApprove)

      case "pri(sites.requests.reject)":
        return this.authorizeReject(request as KnownRequestIdOnly<"auth">)

      case "pri(sites.requests.ignore)":
        return ignoreRequest(request as KnownRequestIdOnly<"auth">)

      case "pri(sites.requests.approveSolSignIn)":
        return this.authorizeApproveSolSignIn(
          request as RequestTypes["pri(sites.requests.approveSolSignIn)"],
        )

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}

const getSolSignInSignature = async (
  result: RequestTypes["pri(sites.requests.approveSolSignIn)"]["result"],
): Promise<{
  account: Account
  signature: string
}> => {
  const { address, message, signature } = result

  const account = await keyringStore.getAccount(address)
  if (!account) throw new Error("Account not found")

  const signedMessage = new TextEncoder().encode(message)

  if (!signature) {
    const signResult = await withSecretKey(address, async (secretKey) => {
      return ed25519.sign(signedMessage, secretKey)
    })

    return { account, signature: base58.encode(signResult.unwrap()) }
  }

  // verify that the signature supplied by the frontend is valid
  if (!ed25519.verify(base58.decode(signature), signedMessage, base58.decode(address)))
    throw new Error("Signature verification failed")

  return { account, signature }
}
