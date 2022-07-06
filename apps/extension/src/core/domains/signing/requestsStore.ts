import { RequestStore, TRespondableRequest } from "@core/libs/RequestStore"
import type {
  AccountJson,
  EthResponseSign,
  EthSignAndSendRequest,
  EthSignRequest,
  ResponseSigning,
  SigningRequest,
} from "@core/types"
import { isEthereumRequest } from "@core/util/isEthereumRequest"
import type { TransactionRequest } from "@ethersproject/providers"
import { assert } from "@polkadot/util"

type EthSignAndSendRequestRespondable = TRespondableRequest<EthSignAndSendRequest, EthResponseSign>

type EthSignRequestRespondable = TRespondableRequest<EthSignRequest, EthResponseSign>

type SignRequestRespondable = TRespondableRequest<SigningRequest, ResponseSigning>
export class SigningRequestsStore extends RequestStore<
  EthSignAndSendRequest | EthSignRequest | SigningRequest,
  EthResponseSign | ResponseSigning
> {
  mapRequestToData(
    request: EthSignAndSendRequestRespondable | EthSignRequestRespondable | SignRequestRespondable
  ) {
    if (isEthereumRequest(request)) {
      const { id, request: ethRequest, url, type, ethChainId, account, method } = request
      return {
        type,
        ethChainId,
        id,
        request: ethRequest,
        url,
        account,
        method,
      } as EthSignAndSendRequestRespondable | EthSignRequestRespondable
    }
    const { account, id, request: pdRequest, url } = request
    return {
      account,
      id,
      request: pdRequest,
      url,
    } as SignRequestRespondable
  }

  public getEthSignAndSendRequest(id: string): EthSignAndSendRequestRespondable {
    const request = this.requests[id]
    assert(isEthereumRequest(request), `Request with id ${id} is not an ethereum signing request`)
    return request as EthSignAndSendRequestRespondable
  }

  public getEthSignRequest(id: string): EthSignRequestRespondable {
    const request = this.requests[id]
    assert(isEthereumRequest(request), `Request with id ${id} is not an ethereum signing request`)
    return request as EthSignRequestRespondable
  }

  public getEthRequest(id: string): EthSignAndSendRequestRespondable | EthSignRequestRespondable {
    const request = this.requests[id]
    assert(isEthereumRequest(request), `Request with id ${id} is not an ethereum signing request`)
    return request as EthSignAndSendRequestRespondable | EthSignRequestRespondable
  }

  public getPolkadotRequest(id: string): SignRequestRespondable {
    const request = this.requests[id]
    assert(!isEthereumRequest(request), `Request with id ${id} is not a polkadot signing request`)
    return request as SignRequestRespondable
  }

  private getBaseEthRequest(url: string, ethChainId: number, account: AccountJson) {
    return {
      url,
      type: "ethereum",
      ethChainId,
      account,
    }
  }

  public signAndSendEth(
    url: string,
    request: TransactionRequest,
    ethChainId: number,
    account: AccountJson
  ) {
    return this.createRequest({
      ...this.getBaseEthRequest(url, ethChainId, account),
      request,
      method: "eth_sendTransaction",
    } as EthSignAndSendRequest)
  }

  public signEth(
    url: string,
    method: "personal_sign" | "eth_signTypedData_v3" | "eth_signTypedData_v4",
    request: EthSignRequest["request"],
    ethChainId: number,
    account: AccountJson
  ) {
    return this.createRequest({
      ...this.getBaseEthRequest(url, ethChainId, account),
      method,
      request,
    } as EthSignRequest)
  }

  public sign(
    url: string,
    request: SigningRequest["request"],
    account: AccountJson
  ): Promise<ResponseSigning> {
    return this.createRequest({
      url,
      request,
      account,
    } as SigningRequest) as Promise<ResponseSigning>
  }
}
