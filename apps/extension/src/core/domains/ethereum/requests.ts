import type { AddEthereumChainParameter } from "@core/domains/ethereum/types"
import { ETH_NETWORK_ADD_PREFIX } from "@core/domains/ethereum/types"
import { requestStore } from "@core/libs/requests/store"
import { urlToDomain } from "@core/util/urlToDomain"

class AddNetworkError extends Error {}

export const requestAddNetwork = async (url: string, network: AddEthereumChainParameter) => {
  const { err, val: urlVal } = urlToDomain(url)
  if (err) throw new AddNetworkError(urlVal)

  // Do not enqueue duplicate requests from the same app
  const isDuplicate = requestStore
    .getAllRequests(ETH_NETWORK_ADD_PREFIX)
    .some((request) => request.idStr === urlVal)

  if (isDuplicate) {
    throw new AddNetworkError(
      "Pending add network already exists for this site. Please accept or reject the request."
    )
  }
  await requestStore.createRequest({ url, network, idStr: urlVal, type: ETH_NETWORK_ADD_PREFIX })
}
