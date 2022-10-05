import { KeyringPair } from "@polkadot/keyring/types"
import type { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import { AccountJson } from "../accounts/types";

export type { SignerPayloadJSON, SignerPayloadRaw } // Make this available elsewhere also

export interface EncryptPayloadBase {
  /**
   * @description The hex-encoded data for this request
   */
  message: string;
}

export interface EncryptPayload extends EncryptPayloadBase {
  /**
   * @description The ss-58 encoded address
   */
  address: string;
}

export interface EncryptResult {
  /**
   * @description The id for this request
   */
  id: number;

  /**
   * @description The resulting encrypted message
   */
  result: Uint8Array;
}

export interface RequestEncrypt {
  readonly payload: EncryptPayload;
  encrypt(pair: KeyringPair): {
      result: Uint8Array;
  };
}

export interface EncryptRequest {
  account: AccountJson;
  id: string;
  request: RequestEncrypt;
  url: string;
}

export interface PGPMessages {
  // PGP message signatures
  "pub(pgp.encrypt)": [EncryptPayload, EncryptResult]
}
