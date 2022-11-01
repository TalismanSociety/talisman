import { RequestStore, TRespondableRequest } from "@core/libs/RequestStore"
import { isDecryptRequest } from "@core/util/isDecryptRequest"
import { assert, u8aToU8a } from "@polkadot/util"
import { AccountJson } from "../accounts/types"
import { DecryptRequest, EncryptRequest, ResponseDecrypt, ResponseEncrypt } from "./types"

type EncryptRequestRespondable = TRespondableRequest<EncryptRequest, ResponseEncrypt>
type DecryptRequestRespondable = TRespondableRequest<DecryptRequest, ResponseDecrypt>

export class EncryptRequestsStore extends RequestStore<
  EncryptRequest | DecryptRequest,
  ResponseEncrypt | ResponseDecrypt
> {
  mapRequestToData(request: EncryptRequestRespondable | DecryptRequestRespondable) {
    const { account, id, request: anyEncryptRequest, url } = request
    if (isDecryptRequest(request)) {
      return {
        account,
        id,
        request: anyEncryptRequest,
        url,
      } as DecryptRequestRespondable
    }
    // default to encrypt request
    // check length of public key in payload
    assert(
      u8aToU8a((request as EncryptRequest).request.payload.recipient).length == 32,
      "Supplied recipient pubkey is incorrect length."
    )

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
    payload: EncryptRequest["request"]["payload"],
    account: AccountJson
  ): Promise<ResponseEncrypt> {
    return this.createRequest({
      url,
      request: { payload, type: "encrypt" },
      account,
    } as EncryptRequest) as Promise<ResponseEncrypt>
  }

  public decrypt(
    url: string,
    payload: DecryptRequest["request"]["payload"],
    account: AccountJson
  ): Promise<ResponseDecrypt> {
    return this.createRequest({
      url,
      request: { payload, type: "decrypt" },
      account,
    } as DecryptRequest) as Promise<ResponseDecrypt>
  }
}
