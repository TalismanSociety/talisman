import { ExtensionHandler } from "@core/libs/Handler"
import { MessageTypes, RequestType, ResponseType } from "@core/types"
import { assert } from "@polkadot/util"
import { addressFromMnemonic } from "@talisman/util/addressFromMnemonic"

export default class MnemonicHandler extends ExtensionHandler {
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

        const seedResult = await this.stores.seedPhrase.getSeed(mnemonicId, transformedPw)
        assert(seedResult.val, "No mnemonic present")
        assert(seedResult.ok, seedResult.val)
        return seedResult.val
      }

      case "pri(mnemonic.confirm)": {
        const { confirmed, mnemonicId } = request as RequestType<"pri(mnemonic.confirm)">
        return await this.stores.seedPhrase.setConfirmed(mnemonicId, confirmed)
      }

      case "pri(mnemonic.address)": {
        const { mnemonic, type } = request as RequestType<"pri(mnemonic.address)">
        return addressFromMnemonic(mnemonic, type)
      }

      case "pri(mnemonic.rename)": {
        const { mnemonicId, name } = request as RequestType<"pri(mnemonic.rename)">
        return this.stores.seedPhrase.setName(mnemonicId, name)
      }

      case "pri(mnemonic.delete)": {
        const { mnemonicId } = request as RequestType<"pri(mnemonic.delete)">
        return this.stores.seedPhrase.delete(mnemonicId)
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
