import { KeyringPair } from "@polkadot/keyring/types";
import { EncryptPayload, RequestEncrypt } from "./types";

export default class RequestMessageEncrypt implements RequestEncrypt {
    readonly payload: EncryptPayload;
    constructor(payload: EncryptPayload) {
      this.payload = payload
    };

    encrypt(pair: KeyringPair) {
      //TODO-pgp: nuke?
      return {result: ''}
    }
}