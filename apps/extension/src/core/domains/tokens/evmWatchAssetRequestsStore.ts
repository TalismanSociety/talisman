import type { CustomErc20Token } from "@core/domains/tokens/types"
import { RequestStore } from "@core/libs/RequestStore"
import type { WatchAssetBase, WatchAssetRequest } from "@core/types"
import { RequestIdOnly } from "@core/types/base"
import { assert } from "@polkadot/util"

class WatchAssetError extends Error {}
export default class EvmWatchAssetRequestsStore extends RequestStore<WatchAssetRequest, unknown> {
  ignoreRequest({ id }: RequestIdOnly) {
    const request = this.requests[id]
    assert(request, `Watch Asset request with id ${id} doesn't exist`)
    delete this.requests[id]
    this.observable.next(this.getAllRequests())
    return true
  }

  async requestWatchAsset(url: string, request: WatchAssetBase, token: CustomErc20Token) {
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
