import { KeyringPair } from "@polkadot/keyring/types"
import { AccountJson } from "../accounts/types";
import { RequestIdOnly } from "@core/types/base"


export interface EncryptPayloadBase {
  /**
   * @description The hex-encoded data for this request
   */
  message: string;
  recipient: string;
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

export type PGPRequest = EncryptRequest


export interface EncryptRequest {
  account: AccountJson;
  id: string;
  request: RequestEncrypt;
  url: string;
}
export interface ResponseEncrypt {
  id: string;
  result: Uint8Array;
}

// might remove - just inheriting pattern from RequestSigningSubscribe from "@polkadot/extension-base/background/types"
export declare type RequestPGPSubscribe = null;

export interface PGPMessages {
  // PGP message signatures
  "pub(pgp.encrypt)": [EncryptPayload, EncryptResult]
  "pri(pgp.requests)": [RequestPGPSubscribe, boolean, PGPRequest[]]
  "pri(pgp.byid.subscribe)": [RequestIdOnly, boolean, PGPRequest]
  "pri(pgp.approveEncrypt)": [RequestIdOnly, boolean]
}