import { KeyringPair } from "@polkadot/keyring/types"
import { AccountJson } from "../accounts/types"
import { RequestIdOnly } from "@core/types/base"

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

export interface DecryptPayloadBase {
  /**
   * @description The hex-encoded data for this request
   */
  message: string
  sender: string
}

export interface DecryptPayload extends DecryptPayloadBase {
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

export interface RequestEncrypt {
  readonly payload: EncryptPayload
  type: string
}

export interface RequestDecrypt {
  readonly payload: DecryptPayload
  type: string
}

export type AnyEncryptRequest = EncryptRequest | DecryptRequest

export interface EncryptRequest {
  account: AccountJson
  id: string
  request: RequestEncrypt
  url: string
}
export interface ResponseEncrypt {
  id: string
  result: string
}

export interface DecryptRequest {
  account: AccountJson
  id: string
  request: RequestDecrypt
  url: string
}

export interface ResponseDecrypt {
  id: string
  result: string | null
}

// might remove - just inheriting pattern from RequestSigningSubscribe from "@polkadot/extension-base/background/types"
export declare type RequestEncryptSubscribe = null

export interface RequestEncryptCancel {
  id: string
}

export interface EncryptMessages {
  // Encrypt message signatures
  "pub(encrypt.encrypt)": [EncryptPayload, EncryptResult]
  "pub(encrypt.decrypt)": [DecryptPayload, DecryptResult]
  "pri(encrypt.requests)": [RequestEncryptSubscribe, boolean, AnyEncryptRequest[]]
  "pri(encrypt.byid.subscribe)": [RequestIdOnly, boolean, AnyEncryptRequest]
  "pri(encrypt.approveEncrypt)": [RequestIdOnly, boolean]
  "pri(encrypt.approveDecrypt)": [RequestIdOnly, boolean]
  "pri(encrypt.cancel)": [RequestIdOnly, boolean]
}
