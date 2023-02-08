import {
  AnyEncryptRequest,
  ENCRYPT_DECRYPT_PREFIX,
  EncryptDecryptRequest,
} from "@core/domains/encrypt/types"

export const isDecryptRequest = (request: AnyEncryptRequest): request is EncryptDecryptRequest => {
  return request.type !== undefined && request.type === ENCRYPT_DECRYPT_PREFIX
}
