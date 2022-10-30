import { DecryptRequest, AnyEncryptRequest } from "@core/domains/encrypt/types"

export const isDecryptRequest = (
  request: AnyEncryptRequest
): request is DecryptRequest => {
  return (
    (request as DecryptRequest).request.payload.sender !== undefined)
}
