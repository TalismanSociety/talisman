import { RequestStore, TRespondableRequest } from "@core/libs/RequestStore"
import { AccountJson } from "../accounts/types"
import { EncryptRequest, ResponseEncrypt } from "./types"

type EncryptRequestRespondable = TRespondableRequest<EncryptRequest, ResponseEncrypt>
export class PGPRequestsStore extends RequestStore<
  EncryptRequest,
  ResponseEncrypt
> {
  mapRequestToData(
    request: EncryptRequestRespondable
  ) {
    const { account, id, request: pgpRequest, url } = request
    return {
      account,
      id,
      request: pgpRequest,
      url,
    } as EncryptRequestRespondable
  }

  public getPGPRequest(id: string): EncryptRequestRespondable {
    const request = this.requests[id]
    return request as EncryptRequestRespondable
  }

  public encrypt(
    url: string,
    request: EncryptRequest["request"],
    account: AccountJson
  ): Promise<ResponseEncrypt> {
    return this.createRequest({
      url,
      request,
      account,
    } as EncryptRequest) as Promise<ResponseEncrypt>
  }
}