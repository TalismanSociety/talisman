import Signer from "@polkadot/extension-base/page/Signer"

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

export type TalismanSigner = Signer & {
  encryptMessage: (payload: EncryptPayload) => Promise<EncryptResult>
  decryptMessage: (payload: DecryptPayload) => Promise<DecryptResult>
}
