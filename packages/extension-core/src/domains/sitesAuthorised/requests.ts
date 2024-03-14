import { assert } from "@polkadot/util"
import { DEFAULT_ETH_CHAIN_ID } from "extension-shared"

import { requestStore } from "../../libs/requests/store"
import { KnownRequestIdOnly } from "../../libs/requests/types"
import type { Port } from "../../types/base"
import { urlToDomain } from "../../util/urlToDomain"
import sitesAuthorisedStore from "./store"
import type { AuthorizedSite, RequestAuthorizeTab } from "./types"

export const ERROR_DUPLICATE_AUTH_REQUEST_MESSAGE =
  "Pending authorisation request already exists for this site. Please accept or reject the request."

class AuthError extends Error {}
export const requestAuthoriseSite = async (
  url: string,
  request: RequestAuthorizeTab,
  port: Port
) => {
  const { err, val: domain } = urlToDomain(url)
  if (err) throw new AuthError(domain)

  // Do not enqueue duplicate authorization requests.
  const isDuplicate = requestStore
    .getAllRequests("auth")
    .some((req) => req.idStr === domain && req.request.ethereum === request.ethereum)

  if (isDuplicate) {
    throw new AuthError(ERROR_DUPLICATE_AUTH_REQUEST_MESSAGE)
  }

  return requestStore
    .createRequest(
      {
        url,
        idStr: domain,
        request,
        type: "auth",
      },
      port
    )
    .then(async (response) => {
      const { addresses = [] } = response

      const { origin, ethereum } = request

      // we have already validated the url here, so no need to try/catch
      const siteAuth = (await sitesAuthorisedStore.getSiteFromUrl(url)) ?? ({} as AuthorizedSite)

      siteAuth.id = domain
      siteAuth.origin = origin
      siteAuth.url = url

      if (ethereum) {
        siteAuth.ethAddresses = addresses

        // set a default value for ethChainId only if empty
        // some sites switch the network before requesting auth, ex nova.arbiscan.io
        if (!siteAuth.ethChainId) siteAuth.ethChainId = DEFAULT_ETH_CHAIN_ID
      } else siteAuth.addresses = addresses

      await sitesAuthorisedStore.set({
        [domain]: siteAuth,
      })
    })
}

export const ignoreRequest = ({ id }: KnownRequestIdOnly<"auth">) => {
  const request = requestStore.getRequest(id)
  assert(request, `Sites Auth Request with id ${id} doesn't exist`)
  requestStore.deleteRequest(id)
  return true
}
