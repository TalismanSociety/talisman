import { RequestStore, TRespondableRequest } from "@core/libs/RequestStore"
import { AccountJson } from "../accounts/types"
import { EncryptRequest, EncryptResult } from "./types"

export class PGPRequestsStore extends RequestStore<
  EncryptRequest,
  EncryptResult
> {
  // TODO-pgp: do we really need this??
  mapRequestToData(
    request: EncryptRequest
  ) {
    const { account, id, request: pgpRequest, url } = request
    return {
      account,
      id,
      request: pgpRequest,
      url,
    } as EncryptRequest
  }

  public getPGPRequest(id: string): EncryptRequest {
    const request = this.requests[id]
    return request as EncryptRequest
  }

  public encrypt(
    url: string,
    request: EncryptRequest["request"],
    account: AccountJson
  ): Promise<EncryptResult> {
    return this.createRequest({
      url,
      request,
      account,
    } as EncryptRequest) as Promise<EncryptResult>
  }
}