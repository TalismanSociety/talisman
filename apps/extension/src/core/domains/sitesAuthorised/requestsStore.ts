import type {
  RequestAuthorizeTab,
  AuthRequestBase,
  AuthRequest,
  RequestIdOnly,
  AuthRequestResponse,
} from "@core/types"
import { stripUrl } from "@core/handlers/helpers"
import { RequestStore } from "@core/libs/RequestStore"
import { assert } from "@polkadot/util"

class AuthError extends Error {}
export default class SitesRequestsStore extends RequestStore<AuthRequestBase, AuthRequestResponse> {
  protected mapRequestToData({ id, idStr, request, url }: AuthRequest): AuthRequestBase {
    return {
      id,
      idStr,
      request,
      url,
    }
  }

  ignoreRequest({ id }: RequestIdOnly) {
    const request = this.requests[id]
    assert(request, `Sites Auth Request with id ${id} doesn't exist`)
    delete this.requests[id]
    this.observable.next(this.getAllRequests())
    return true
  }

  async requestAuthorizeUrl(url: string, request: RequestAuthorizeTab) {
    const idStr = stripUrl(url)

    // Do not enqueue duplicate authorization requests.
    const isDuplicate = this.getAllRequests().some((request) => request.idStr === idStr)

    if (isDuplicate) {
      throw new AuthError(
        "Pending authorisation request already exists for this site. Please accept or reject the request."
      )
    }
    await this.createRequest({ url, request, idStr })
    return true
  }
}
