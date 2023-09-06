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
    if (type === "new" && mnemonic) {
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
    } else if (type === "talisman" && mnemonicId) {
      await this.stores.app.set({ vaultVerifierCertificateMnemonicId: mnemonicId })
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

        const seedResult = await this.stores.mnemonics.getSeed(mnemonicId, transformedPw)
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
