import {
  AnyEncryptRequest,
  ENCRYPT_DECRYPT_PREFIX,
  EncryptDecryptRequest,
} from "../domains/encrypt/types"

export const isDecryptRequest = (request: AnyEncryptRequest): request is EncryptDecryptRequest => {
  return request.type !== undefined && request.type === ENCRYPT_DECRYPT_PREFIX
}
