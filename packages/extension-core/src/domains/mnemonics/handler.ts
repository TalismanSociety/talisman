import { assert } from "@polkadot/util"
import { isValidMnemonic } from "@talismn/crypto"

import { genericAsyncSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestType, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { keyringStore } from "../keyring/store"
import { RequestSetVerifierCertificateMnemonic } from "./types"

export default class MnemonicHandler extends ExtensionHandler {
  private async setVerifierCertMnemonic(options: RequestSetVerifierCertificateMnemonic) {
    switch (options.type) {
      case "new": {
        const { mnemonic, confirmed } = options
        assert(mnemonic, "Mnemonic should be provided")

        const isValid = isValidMnemonic(mnemonic)
        assert(isValid, "Invalid mnemonic")

        const password = await this.stores.password.getPassword()
        if (!password) throw new Error("Unauthorised")

        const { id } = await keyringStore.addMnemonic({
          name: "Vault Verifier Certificate Mnemonic",
          mnemonic,
          confirmed,
        })
        await this.stores.app.set({ vaultVerifierCertificateMnemonicId: id })
        return true
      }
      case "existing": {
        const { mnemonicId } = options
        assert(mnemonicId, "MnemonicId should be provided")

        const mnemonic = await keyringStore.getMnemonic(mnemonicId)
        assert(mnemonic, "Unable to find mnemonic")

        await this.stores.app.set({ vaultVerifierCertificateMnemonicId: mnemonicId })
        return true
      }
      default:
        throw new Error("Invalid request")
    }
  }

  private mnemonicsSubscribe(id: string, port: Port) {
    return genericAsyncSubscription<"pri(mnemonics.subscribe)">(id, port, keyringStore.mnemonics$)
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(mnemonics.subscribe)":
        return this.mnemonicsSubscribe(id, port)

      case "pri(mnemonics.unlock)": {
        const { password, mnemonicId } = request as RequestType<"pri(mnemonics.unlock)">
        const transformedPw = await this.stores.password.transformPassword(password)
        assert(transformedPw, "Password error")

        return keyringStore.getMnemonicText(mnemonicId, transformedPw)
      }

      case "pri(mnemonics.confirm)": {
        const { confirmed, mnemonicId } = request as RequestType<"pri(mnemonics.confirm)">
        await keyringStore.updateMnemonic(mnemonicId, { confirmed })
        return true
      }

      case "pri(mnemonics.rename)": {
        const { mnemonicId, name } = request as RequestType<"pri(mnemonics.rename)">
        await keyringStore.updateMnemonic(mnemonicId, { name })
        return true
      }

      case "pri(mnemonics.delete)": {
        const { mnemonicId } = request as RequestType<"pri(mnemonics.delete)">
        await keyringStore.removeMnemonic(mnemonicId)
        return true
      }

      case "pri(mnemonics.validateMnemonic)":
        return isValidMnemonic(request as string)

      case "pri(mnemonics.setVerifierCertMnemonic)":
        return this.setVerifierCertMnemonic(request as RequestSetVerifierCertificateMnemonic)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
