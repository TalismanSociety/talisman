import type { AddEthereumChainParameter } from "@core/domains/ethereum/types"
import {
  ETH_NETWORK_ADD_PREFIX,
  WATCH_ASSET_PREFIX,
  WatchAssetBase,
  WatchAssetRequestIdOnly,
} from "@core/domains/ethereum/types"
import type { CustomErc20Token } from "@core/domains/tokens/types"
import { requestStore } from "@core/libs/requests/store"
import type { Port } from "@core/types/base"
import { urlToDomain } from "@core/util/urlToDomain"

class AddNetworkError extends Error {}

export const requestAddNetwork = async (
  url: string,
  network: AddEthereumChainParameter,
  port: Port
) => {
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
  await requestStore.createRequest(
    { url, network, idStr: urlVal, type: ETH_NETWORK_ADD_PREFIX },
    port
  )
}

class WatchAssetError extends Error {}

export const ignoreRequest = ({ id }: WatchAssetRequestIdOnly) => {
  requestStore.deleteRequest(id)
  return true
}

export const requestWatchAsset = async (
  url: string,
  request: WatchAssetBase,
  token: CustomErc20Token,
  warnings: string[],
  port: Port
) => {
  const address = request.options.address
  const isDuplicate = requestStore
    .getAllRequests(WATCH_ASSET_PREFIX)
    .some(({ request }) => request.options.address === address)

  if (isDuplicate) {
    throw new WatchAssetError(
      "Pending watch asset request already exists. Please accept or reject the request."
    )
  }
  await requestStore.createRequest(
    { type: WATCH_ASSET_PREFIX, url, request, token, warnings },
    port
  )
  return true
}
