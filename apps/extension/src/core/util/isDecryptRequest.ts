import { DecryptRequest, PGPRequest } from "@core/domains/pgp/types"

export const isDecryptRequest = (
  request: PGPRequest
): request is DecryptRequest => {
  return (
    (request as DecryptRequest).request.payload.sender !== undefined)
}
