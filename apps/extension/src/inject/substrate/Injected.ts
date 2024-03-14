import type { DecryptPayload, DecryptResult, EncryptPayload, EncryptResult } from "@extension/core"
import type { SendRequest } from "@extension/core"
import PolkadotInjected from "@polkadot/extension-base/page/Injected"
import Signer from "@polkadot/extension-base/page/Signer"

// external to class
let sendRequest: SendRequest
export class TalismanSigner extends Signer {
  constructor(_sendRequest: SendRequest) {
    super(_sendRequest)
    sendRequest = _sendRequest
  }

  public async encryptMessage(payload: EncryptPayload): Promise<EncryptResult> {
    const result = await sendRequest("pub(encrypt.encrypt)", payload)

    return {
      ...result,
    }
  }

  public async decryptMessage(payload: DecryptPayload): Promise<DecryptResult> {
    const result = await sendRequest("pub(encrypt.decrypt)", payload)

    return {
      ...result,
    }
  }
}

export default class TalismanInjected extends PolkadotInjected {
  public readonly signer: TalismanSigner

  constructor(sendRequest: SendRequest) {
    super(sendRequest)
    this.signer = new TalismanSigner(sendRequest)
  }
}
