import { KeyringPair } from "@polkadot/keyring/types";
import { DecryptPayload, RequestDecrypt } from "./types";

export default class RequestMessageDecrypt implements RequestDecrypt {
    readonly payload: DecryptPayload;
    constructor(payload: DecryptPayload) {
      this.payload = payload
    };

}