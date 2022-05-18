import type { AddEthereumChainRequest, AddEthereumChainParameter } from "@core/types"
import { stripUrl } from "@core/handlers/helpers"
import { RequestStore } from "@core/libs/RequestStore"

class AddNetworkError extends Error {}

export default class EthereumNetworksRequestsStore extends RequestStore<
  AddEthereumChainRequest,
  null
> {
  protected mapRequestToData(req: AddEthereumChainRequest) {
    return req
  }

  async requestAddNetwork(url: string, network: AddEthereumChainParameter) {
    const idStr = stripUrl(url)

    // Do not enqueue duplicate requests from the same app
    const isDuplicate = this.getAllRequests().some((request) => request.idStr === idStr)

    if (isDuplicate) {
      throw new AddNetworkError(
        "Pending add network already exists for this site. Please accept or reject the request."
      )
    }
    await this.createRequest({ url, network, idStr })
    return null
  }
}
