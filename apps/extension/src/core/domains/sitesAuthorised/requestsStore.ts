import {
  AuthRequestBase,
  AuthRequestResponse,
  RequestAuthorizeTab,
} from "@core/domains/sitesAuthorised/types"
import { urlToDomain } from "@core/util/urlToDomain"
import { RequestStore } from "@core/libs/RequestStore"
import type { RequestIdOnly } from "@core/types/base"
import { assert } from "@polkadot/util"

class AuthError extends Error {}
export default class SitesRequestsStore extends RequestStore<AuthRequestBase, AuthRequestResponse> {
  ignoreRequest({ id }: RequestIdOnly) {
    const request = this.requests[id]
    assert(request, `Sites Auth Request with id ${id} doesn't exist`)
    delete this.requests[id]
    this.observable.next(this.getAllRequests())
    return true
  }

  async requestAuthorizeUrl(url: string, request: RequestAuthorizeTab) {
    const { err, val: urlVal } = urlToDomain(url)
    if (err) throw new AuthError(urlVal)

    // Do not enqueue duplicate authorization requests.
    const isDuplicate = this.getAllRequests().some((request) => request.idStr === urlVal)

    if (isDuplicate) {
      throw new AuthError(
        "Pending authorisation request already exists for this site. Please accept or reject the request."
      )
    }
    await this.createRequest({ url, request, idStr: urlVal })
    return true
  }
}
