import { AccountAddressType } from "../accounts/types"

export declare type MnemonicSubscriptionResult = {
  confirmed?: boolean
}

export declare type RequestAddressFromMnemonic = {
  mnemonic: string
  type?: AccountAddressType
}

type MnemonicId = string

export declare type MnemonicUnlockRequest = {
  mnemonicId: MnemonicId
  password: string
}

export declare type MnemonicConfirmRequest = {
  mnemonicId: MnemonicId
  confirmed: boolean
}

export declare type MnemonicRenameRequest = {
  mnemonicId: MnemonicId
  name: string
}

export interface MnemonicMessages {
  // mnemonic message signatures
  "pri(mnemonic.unlock)": [MnemonicUnlockRequest, string]
  "pri(mnemonic.confirm)": [MnemonicConfirmRequest, boolean]
  "pri(mnemonic.address)": [RequestAddressFromMnemonic, string]
  "pri(mnemonic.rename)": [MnemonicRenameRequest, boolean]
}
