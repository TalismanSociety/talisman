import { BaseRequest, BaseRequestId } from "../../types/base"
import { AccountJson } from "../accounts/types"

export interface EncryptPayloadBase {
  /**
   * @description The data for this request
   */
  message: string
  recipient: string
}

export interface EncryptPayload extends EncryptPayloadBase {
  /**
   * @description The ss-58 encoded address
   */
  address: string
}

export interface EncryptResult {
  /**
   * @description The id for this request
   */
  id: number

  /**
   * @description The resulting encrypted message, hex encoded
   */
  result: string
}

export type DecryptPayloadBase = {
  /**
   * @description The hex-encoded data for this request
   */
  message: string
  sender: string
}

export type DecryptPayload = DecryptPayloadBase & {
  /**
   * @description The ss-58 encoded address
   */
  address: string
}

export interface DecryptResult {
  /**
   * @description The id for this request
   */
  id: number

  /**
   * @description The resulting decrypted message
   */
  result: string
}

export type ENCRYPT_ENCRYPT_PREFIX = "encrypt"
export const ENCRYPT_ENCRYPT_PREFIX: ENCRYPT_ENCRYPT_PREFIX = "encrypt"

export type ENCRYPT_DECRYPT_PREFIX = "decrypt"
export const ENCRYPT_DECRYPT_PREFIX: ENCRYPT_DECRYPT_PREFIX = "decrypt"

export interface RequestEncrypt {
  readonly payload: EncryptPayload
}

export type RequestDecrypt = {
  readonly payload: DecryptPayload
}

export type EncryptRequestId = BaseRequestId<ENCRYPT_ENCRYPT_PREFIX>
export type EncryptRequestIdOnly = { id: EncryptRequestId }

export type DecryptRequestId = BaseRequestId<ENCRYPT_DECRYPT_PREFIX>
export type DecryptRequestIdOnly = { id: DecryptRequestId }

interface BaseEncryptRequest<T extends ENCRYPT_ENCRYPT_PREFIX | ENCRYPT_DECRYPT_PREFIX>
  extends BaseRequest<T> {
  account: AccountJson
  url: string
}
export interface EncryptEncryptRequest extends BaseEncryptRequest<ENCRYPT_ENCRYPT_PREFIX> {
  request: RequestEncrypt
}
export interface EncryptDecryptRequest extends BaseEncryptRequest<ENCRYPT_DECRYPT_PREFIX> {
  request: RequestDecrypt
}

export type AnyEncryptRequest = EncryptEncryptRequest | EncryptDecryptRequest
export type ResponseEncryptEncrypt = {
  id: string
  result: string
}

export type ResponseEncryptDecrypt = {
  id: string
  result: string | null
}

export type ResponseEncrypt = ResponseEncryptEncrypt | ResponseEncryptDecrypt

// might remove - just inheriting pattern from RequestSigningSubscribe from "@polkadot/extension-base/background/types"
export declare type RequestEncryptSubscribe = null

export type AnyEncryptRequestIdOnly = EncryptRequestIdOnly | DecryptRequestIdOnly
export type RequestEncryptCancel = AnyEncryptRequestIdOnly

export interface EncryptMessages {
  // Encrypt message signatures
  "pub(encrypt.encrypt)": [EncryptPayload, EncryptResult]
  "pub(encrypt.decrypt)": [DecryptPayload, DecryptResult]
  "pri(encrypt.approveEncrypt)": [EncryptRequestIdOnly, boolean]
  "pri(encrypt.approveDecrypt)": [DecryptRequestIdOnly, boolean]
  "pri(encrypt.cancel)": [AnyEncryptRequestIdOnly, boolean]
}

export interface EncryptRequests {
  [ENCRYPT_ENCRYPT_PREFIX]: [EncryptEncryptRequest, ResponseEncryptEncrypt]
  [ENCRYPT_DECRYPT_PREFIX]: [EncryptDecryptRequest, ResponseEncryptDecrypt]
}
