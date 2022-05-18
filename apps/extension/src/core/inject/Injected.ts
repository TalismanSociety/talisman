import PolkadotInjected from "@polkadot/extension-base/page/Injected"
import Signer from "@polkadot/extension-base/page/Signer"
import type { SendRequest } from "@core/types"

export class TalismanSigner extends Signer {}

export default class TalismanInjected extends PolkadotInjected {
  public readonly signer: TalismanSigner

  constructor(sendRequest: SendRequest) {
    super(sendRequest)
    this.signer = new TalismanSigner(sendRequest)
  }
}
