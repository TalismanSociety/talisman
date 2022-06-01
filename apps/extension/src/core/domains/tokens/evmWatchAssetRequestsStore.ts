import type { RequestIdOnly, WatchAssetRequest, WatchAssetBase } from "@core/types"
import { RequestStore } from "@core/libs/RequestStore"
import { assert } from "@polkadot/util"

class WatchAssetError extends Error {}
export default class EvmWatchAssetRequestsStore extends RequestStore<WatchAssetRequest, {}> {
  protected mapRequestToData({ id, url, request }: WatchAssetRequest): WatchAssetRequest {
    return {
      id,
      url,
      request,
    }
  }

  ignoreRequest({ id }: RequestIdOnly) {
    const request = this.requests[id]
    assert(request, `Watch Asset request with id ${id} doesn't exist`)
    delete this.requests[id]
    this.observable.next(this.getAllRequests())
    return true
  }

  async requestWatchAsset(url: string, request: WatchAssetBase) {
    const id = request.options.address
    const isDuplicate = this.getAllRequests().some(({ request }) => request.options.address === id)

    if (isDuplicate) {
      throw new WatchAssetError(
        "Pending watch asset request already exists. Please accept or reject the request."
      )
    }
    await this.createRequest({ url, request, id })
    return true
  }
}
