import type { RequestIdOnly, WatchAssetRequest, WatchAssetBase, Erc20Token } from "@core/types"
import { RequestStore } from "@core/libs/RequestStore"
import { assert } from "@polkadot/util"

class WatchAssetError extends Error {}
export default class EvmWatchAssetRequestsStore extends RequestStore<WatchAssetRequest, {}> {
  protected mapRequestToData({ id, url, request, token }: WatchAssetRequest): WatchAssetRequest {
    return {
      id,
      url,
      request,
      token,
    }
  }

  ignoreRequest({ id }: RequestIdOnly) {
    const request = this.requests[id]
    assert(request, `Watch Asset request with id ${id} doesn't exist`)
    delete this.requests[id]
    this.observable.next(this.getAllRequests())
    return true
  }

  async requestWatchAsset(url: string, request: WatchAssetBase, token: Erc20Token) {
    const id = request.options.address
    const isDuplicate = this.getAllRequests().some(({ request }) => request.options.address === id)

    if (isDuplicate) {
      throw new WatchAssetError(
        "Pending watch asset request already exists. Please accept or reject the request."
      )
    }
    await this.createRequest({ url, request, id, token })
    return true
  }
}
