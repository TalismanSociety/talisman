import PolkadotInjected from "@polkadot/extension-base/page/Injected"
import Signer from "@polkadot/extension-base/page/Signer"
import type { SendRequest } from "@core/types"
import { EncryptResult, EncryptPayload } from "../domains/pgp/types"

// external to class
let sendRequest: SendRequest;
export class TalismanSigner extends Signer {

  public async encryptMessage (payload: EncryptPayload): Promise<EncryptResult> {
    // const id = ++nextId;
    const result = await sendRequest('pub(pgp.encrypt)', payload);

    return {
      ...result,
    };
  }
}

export default class TalismanInjected extends PolkadotInjected {
  public readonly signer: TalismanSigner

  constructor(sendRequest: SendRequest) {
    super(sendRequest)
    this.signer = new TalismanSigner(sendRequest)
  }
}
