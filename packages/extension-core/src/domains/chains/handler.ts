import { assert, u8aToHex } from "@polkadot/util"

import { ExtensionHandler } from "../../libs/Handler"
import { generateQrAddNetworkSpecs, generateQrUpdateNetworkMetadata } from "../../libs/QrGenerator"
import { MessageTypes, RequestType, RequestTypes, ResponseType } from "../../types"
import { keyringStore } from "../keyring/store"

export class ChainsHandler extends ExtensionHandler {
  private async validateVaultVerifierCertificateMnemonic() {
    const vaultMnemoicId = await this.stores.app.get("vaultVerifierCertificateMnemonicId")
    assert(vaultMnemoicId, "No Polkadot Vault Verifier Certificate Mnemonic set")
    const vaultCipher = await keyringStore.getMnemonic(vaultMnemoicId)
    assert(vaultCipher, "No Polkadot Vault Verifier Certificate Mnemonic found")
    return true
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(chains.generateQr.addNetworkSpecs)": {
        await this.validateVaultVerifierCertificateMnemonic()

        const { genesisHash } = request as RequestType<"pri(chains.generateQr.addNetworkSpecs)">
        const data = await generateQrAddNetworkSpecs(genesisHash)
        // serialize as hex for transfer
        return u8aToHex(data)
      }

      case "pri(chains.generateQr.updateNetworkMetadata)": {
        await this.validateVaultVerifierCertificateMnemonic()

        const { genesisHash, specVersion } =
          request as RequestType<"pri(chains.generateQr.updateNetworkMetadata)">
        const data = await generateQrUpdateNetworkMetadata(genesisHash, specVersion)
        // serialize as hex for transfer
        return u8aToHex(data)
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
