import { Account } from "@talismn/keyring"

import type { Port } from "../../types/base"
import type {
  DecryptPayload,
  EncryptPayload,
  ResponseEncryptDecrypt,
  ResponseEncryptEncrypt,
} from "./types"
import { requestStore } from "../../libs/requests/store"
import { ENCRYPT_DECRYPT_PREFIX, ENCRYPT_ENCRYPT_PREFIX } from "./types"

export const requestEncrypt = (
  url: string,
  payload: EncryptPayload,
  account: Account,
  port: Port,
): Promise<ResponseEncryptEncrypt> => {
  return requestStore.createRequest(
    {
      url,
      type: ENCRYPT_ENCRYPT_PREFIX,
      request: { payload },
      account,
    },
    port,
  ) as Promise<ResponseEncryptEncrypt>
}

export const requestDecrypt = (
  url: string,
  payload: DecryptPayload,
  account: Account,
  port: Port,
): Promise<ResponseEncryptDecrypt> => {
  return requestStore.createRequest(
    {
      url,
      type: ENCRYPT_DECRYPT_PREFIX,
      request: { payload },
      account,
    },
    port,
  )
}
