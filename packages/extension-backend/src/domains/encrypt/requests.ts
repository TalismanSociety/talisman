import { requestStore } from "../../libs/requests/store"
import type { Port } from "../../types/base"
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
  account: AccountJson,
  port: Port
): Promise<ResponseEncryptEncrypt> => {
  return requestStore.createRequest(
    {
      url,
      type: ENCRYPT_ENCRYPT_PREFIX,
      request: { payload },
      account,
    },
    port
  ) as Promise<ResponseEncryptEncrypt>
}

export const requestDecrypt = (
  url: string,
  payload: DecryptPayload,
  account: AccountJson,
  port: Port
): Promise<ResponseEncryptDecrypt> => {
  return requestStore.createRequest(
    {
      url,
      type: ENCRYPT_DECRYPT_PREFIX,
      request: { payload },
      account,
    },
    port
  )
}
