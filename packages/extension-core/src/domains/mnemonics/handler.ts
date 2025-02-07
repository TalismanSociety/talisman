import { assert } from "@polkadot/util"
import { isValidMnemonic } from "@talismn/crypto"

import { genericAsyncSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestType, ResponseType } from "../../types"
import { Port } from "../../types/base"
import {
  RequestAccountCreateOptionsExistingMnemonic,
  RequestAccountCreateOptionsNewMnemonic,
} from "../accounts/types"
import { keyringStore } from "../keyring/store"
import { RequestSetVerifierCertificateMnemonic } from "./types"

export default class MnemonicHandler extends ExtensionHandler {
  private async setVerifierCertMnemonic({ type, options }: RequestSetVerifierCertificateMnemonic) {
    switch (type) {
      case "new":
      case "import": {
        const { mnemonic, confirmed } = options as RequestAccountCreateOptionsNewMnemonic
        assert(mnemonic, "Mnemonic should be provided")
        const isValid = isValidMnemonic(mnemonic)
        assert(isValid, "Invalid mnemonic")
        const password = await this.stores.password.getPassword()
        if (!password) throw new Error("Unauthorised")
        try {
          const { id } = await keyringStore.addMnemonic({
            name: "Vault Verifier Certificate Mnemonic",
            mnemonic,
            confirmed,
          })
          await this.stores.app.set({ vaultVerifierCertificateMnemonicId: id })
        } catch (cause) {
          throw new Error("Unable to set Verifier Certificate Mnemonic", { cause })
        }

        break
      }
      case "existing": {
        const { mnemonicId } = options as RequestAccountCreateOptionsExistingMnemonic
        assert(mnemonicId, "MnemonicId should be provided")
        await this.stores.app.set({ vaultVerifierCertificateMnemonicId: mnemonicId })
        break
      }
      default:
        throw new Error(`Unable to handle setVerifierCertMnemonic message with type ${type}`)
    }
    return true
  }

  private mnemonicsSubscribe(id: string, port: Port) {
    return genericAsyncSubscription<"pri(mnemonic.subscribe)">(id, port, keyringStore.accounts$)
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(mnemonic.subscribe)":
        return this.mnemonicsSubscribe(id, port)

      case "pri(mnemonic.unlock)": {
        const { password, mnemonicId } = request as RequestType<"pri(mnemonic.unlock)">
        const transformedPw = await this.stores.password.transformPassword(password)
        assert(transformedPw, "Password error")

        return keyringStore.getMnemonicText(mnemonicId, transformedPw)
      }

      case "pri(mnemonic.confirm)": {
        const { confirmed, mnemonicId } = request as RequestType<"pri(mnemonic.confirm)">
        await keyringStore.updateMnemonic(mnemonicId, { confirmed })
        return true
      }

      case "pri(mnemonic.rename)": {
        const { mnemonicId, name } = request as RequestType<"pri(mnemonic.rename)">
        await keyringStore.updateMnemonic(mnemonicId, { name })
        return true
      }

      case "pri(mnemonic.delete)": {
        const { mnemonicId } = request as RequestType<"pri(mnemonic.delete)">
        await keyringStore.removeMnemonic(mnemonicId)
        return true
      }

      case "pri(mnemonic.validateMnemonic)":
        return isValidMnemonic(request as string)

      case "pri(mnemonic.setVerifierCertMnemonic)":
        return this.setVerifierCertMnemonic(request as RequestSetVerifierCertificateMnemonic)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
