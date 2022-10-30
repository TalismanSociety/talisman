import { RequestStore, TRespondableRequest } from "@core/libs/RequestStore"
import { isDecryptRequest } from "@core/util/isDecryptRequest"
import { assert } from "@polkadot/util"
import { AccountJson } from "../accounts/types"
import { DecryptRequest, EncryptRequest, ResponseDecrypt, ResponseEncrypt } from "./types"

type EncryptRequestRespondable = TRespondableRequest<EncryptRequest, ResponseEncrypt>
type DecryptRequestRespondable = TRespondableRequest<DecryptRequest, ResponseDecrypt>

export class EncryptRequestsStore extends RequestStore<
  EncryptRequest | DecryptRequest,
  ResponseEncrypt | ResponseDecrypt
> {
  mapRequestToData(
    request: EncryptRequestRespondable | DecryptRequestRespondable
  ) {
    const { account, id, request: anyEncryptRequest, url } = request
    if(isDecryptRequest(request)){
      return {
        account,
        id,
        request: anyEncryptRequest,
        url,
      } as DecryptRequestRespondable
    }
    // default to encrypt request
    return {
      account,
      id,
      request: anyEncryptRequest,
      url,
    } as EncryptRequestRespondable  
  }

  public getEncryptRequest(id: string): EncryptRequestRespondable {
    const request = this.requests[id]
    assert(!isDecryptRequest(request), `Request with id ${id} is not an encryption request`)
    return request as EncryptRequestRespondable
  }

  public getDecryptRequest(id: string): DecryptRequestRespondable {
    const request = this.requests[id]
    assert(isDecryptRequest(request), `Request with id ${id} is not a decryption request`)
    return request as DecryptRequestRespondable
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

  public decrypt(
    url: string,
    request: DecryptRequest["request"],
    account: AccountJson
  ): Promise<ResponseDecrypt> {
    return this.createRequest({
      url,
      request,
      account,
    } as DecryptRequest) as Promise<ResponseDecrypt>
  }
}