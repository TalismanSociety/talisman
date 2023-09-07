import { ExtensionHandler } from "@core/libs/Handler"
import { MessageTypes, RequestType, ResponseType } from "@core/types"
import { assert } from "@polkadot/util"
import { mnemonicValidate } from "@polkadot/util-crypto"

import { SOURCES } from "./store"
import { RequestSetVerifierCertificateMnemonic } from "./types"

export default class MnemonicHandler extends ExtensionHandler {
  private async setVerifierCertMnemonic({
    type,
    mnemonic,
    mnemonicId,
  }: RequestSetVerifierCertificateMnemonic) {
    switch (type) {
      case "import": {
        assert(mnemonic, "Mnemonic should be provided")
        assert(!mnemonicId, "MnemonicId should not be provided")
        const isValidMnemonic = mnemonicValidate(mnemonic)
        assert(isValidMnemonic, "Invalid mnemonic")
        const password = this.stores.password.getPassword()
        if (!password) throw new Error("Unauthorised")
        const { err, val } = await this.stores.mnemonics.add(
          "Vault Verifier Certificate Mnemonic",
          mnemonic,
          password,
          SOURCES.Imported
        )
        if (err) throw new Error("Unable to set Verifier Certificate Mnemonic", { cause: val })
        await this.stores.app.set({ vaultVerifierCertificateMnemonicId: val })
        break
      }
      case "existing": {
        assert(!mnemonic, "Mnemonic should not be provided")
        assert(mnemonicId, "MnemonicId should be provided")
        await this.stores.app.set({ vaultVerifierCertificateMnemonicId: mnemonicId })
        break
      }
      default:
        throw new Error(`Unable to handle setVerifierCertMnemonic message with type ${type}`)
    }
    return true
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(mnemonic.unlock)": {
        const { password, mnemonicId } = request as RequestType<"pri(mnemonic.unlock)">
        const transformedPw = await this.stores.password.transformPassword(password)
        assert(transformedPw, "Password error")

        const seedResult = await this.stores.mnemonics.getMnemonic(mnemonicId, transformedPw)
        assert(seedResult.val, "No mnemonic present")
        assert(seedResult.ok, seedResult.val)
        return seedResult.val
      }

      case "pri(mnemonic.confirm)": {
        const { confirmed, mnemonicId } = request as RequestType<"pri(mnemonic.confirm)">
        return await this.stores.mnemonics.setConfirmed(mnemonicId, confirmed)
      }

      case "pri(mnemonic.rename)": {
        const { mnemonicId, name } = request as RequestType<"pri(mnemonic.rename)">
        return this.stores.mnemonics.setName(mnemonicId, name)
      }

      case "pri(mnemonic.delete)": {
        const { mnemonicId } = request as RequestType<"pri(mnemonic.delete)">
        return this.stores.mnemonics.delete(mnemonicId)
      }

      case "pri(mnemonic.validateMnemonic)":
        return mnemonicValidate(request as string)

      case "pri(mnemonic.setVerifierCertMnemonic)":
        return this.setVerifierCertMnemonic(request as RequestSetVerifierCertificateMnemonic)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
