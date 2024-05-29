import type { CustomEvmErc20Token } from "@talismn/balances"
import { AddEthereumChainParameter } from "viem"

import { requestStore } from "../../libs/requests/store"
import type { Port } from "../../types/base"
import { urlToDomain } from "../../util/urlToDomain"
import {
  ETH_NETWORK_ADD_PREFIX,
  WATCH_ASSET_PREFIX,
  WatchAssetBase,
  WatchAssetRequestIdOnly,
} from "./types"

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
  token: CustomEvmErc20Token,
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
