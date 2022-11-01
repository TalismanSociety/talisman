import { DecryptRequest, AnyEncryptRequest } from "@core/domains/encrypt/types"

export const isDecryptRequest = (request: AnyEncryptRequest): request is DecryptRequest => {
  return (
    (request as DecryptRequest).request.type !== undefined &&
    (request as DecryptRequest).request.type === "decrypt"
  )
}