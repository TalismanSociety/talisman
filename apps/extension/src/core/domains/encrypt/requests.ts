import { requestStore } from "@core/libs/requests/store"

import { AccountJson } from "../accounts/types"
import type {
  DecryptPayload,
  EncryptPayload,
  ResponseEncryptDecrypt,
  ResponseEncryptEncrypt,
} from "./types"
import { ENCRYPT_DECRYPT_PREFIX, ENCRYPT_ENCRYPT_PREFIX } from "./types"

export const requestEncrypt = (
  url: string,
  payload: EncryptPayload,
  account: AccountJson
): Promise<ResponseEncryptEncrypt> => {
  return requestStore.createRequest({
    url,
    type: ENCRYPT_ENCRYPT_PREFIX,
    request: { payload },
    account,
  }) as Promise<ResponseEncryptEncrypt>
}

export const requestDecrypt = (
  url: string,
  payload: DecryptPayload,
  account: AccountJson
): Promise<ResponseEncryptDecrypt> => {
  return requestStore.createRequest({
    url,
    type: ENCRYPT_DECRYPT_PREFIX,
    request: { payload },
    account,
  })
}
