import {
  AuthRequestApprove,
  AuthorizedSite,
  RequestAuthorizedSiteForget,
  RequestAuthorizedSiteUpdate,
} from "@core/domains/sitesAuthorised/types"
import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import { requestStore } from "@core/libs/requests/store"
import { KnownRequestIdOnly } from "@core/libs/requests/types"
import type { MessageTypes, RequestType, ResponseType } from "@core/types"
import type { Port, RequestIdOnly } from "@core/types/base"
import { assert } from "@polkadot/util"
import { isEthereumAddress } from "@polkadot/util-crypto"

import { ignoreRequest } from "./requests"

export default class SitesAuthorisationHandler extends ExtensionHandler {
  private async authorizedForget({ id, type }: RequestAuthorizedSiteForget) {
    await this.stores.sites.forgetSite(id, type)
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
      authType: queued.request.ethereum ? "ethereum" : "substrate",
      withEthAccounts: queued.request.ethereum ? undefined : addresses.some(isEthereumAddress),
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
      authType: queued.request.ethereum ? "ethereum" : "substrate",
    })
    reject(new Error("Rejected"))

    return true
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port
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

      // --------------------------------------------------------------------
      // authorised site requests handlers ----------------------------------
      // --------------------------------------------------------------------
      case "pri(sites.requests.approve)":
        return this.authorizeApprove(request as AuthRequestApprove)

      case "pri(sites.requests.reject)":
        return this.authorizeReject(request as KnownRequestIdOnly<"auth">)

      case "pri(sites.requests.ignore)":
        return ignoreRequest(request as KnownRequestIdOnly<"auth">)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
