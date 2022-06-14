import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import { assert } from "@polkadot/util"
import type {
  AuthRequestApprove,
  MessageTypes,
  Port,
  RequestAuthorizedSiteForget,
  RequestAuthorizedSiteUpdate,
  RequestIdOnly,
  RequestTypes,
  ResponseType,
} from "core/types"

export default class SitesAuthorisationHandler extends ExtensionHandler {
  private authorizedForget({ id, type }: RequestAuthorizedSiteForget): boolean {
    this.stores.sites.forgetSite(id, type)
    return true
  }

  private authorizedUpdate({ id, props }: RequestAuthorizedSiteUpdate): boolean {
    this.stores.sites.updateSite(id, props)
    talismanAnalytics.capture("authorised site update addresses", {
      url: id,
    })
    return true
  }

  private authorizeApprove({ id, addresses = [], ethChainId }: AuthRequestApprove): boolean {
    const queued = this.state.requestStores.sites.getRequest(id)
    assert(queued, "Unable to find request")

    talismanAnalytics.capture("authorised site approve", { url: queued.idStr })
    const { resolve } = queued
    resolve({ addresses, ethChainId })

    return true
  }

  private authorizeReject({ id }: RequestIdOnly): boolean {
    const queued = this.state.requestStores.sites.getRequest(id)
    assert(queued, "Unable to find request")

    const { reject } = queued
    talismanAnalytics.capture("authorised site reject", { url: queued.idStr })
    reject(new Error("Rejected"))

    return true
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
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
      case "pri(sites.requests.subscribe)":
        return this.state.requestStores.sites.subscribe<"pri(sites.requests.subscribe)">(id, port)

      case "pri(sites.requests.approve)":
        return this.authorizeApprove(request as AuthRequestApprove)

      case "pri(sites.requests.reject)":
        return this.authorizeReject(request as RequestIdOnly)

      case "pri(sites.requests.ignore)":
        return this.state.requestStores.sites.ignoreRequest(request as RequestIdOnly)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
