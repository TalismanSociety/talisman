import { Mnemonic } from "@talismn/keyring"

export declare type MnemonicSubscriptionResult = {
  confirmed?: boolean
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

export declare type MnemonicDeleteRequest = {
  mnemonicId: MnemonicId
}

type SetVerifierCertificateNewOptions = {
  type: "new"
  mnemonic: string
  confirmed: boolean
}
type SetVerifierCertificateExistingOptions = {
  type: "existing"
  mnemonicId: string
}

export type RequestSetVerifierCertificateMnemonic =
  | SetVerifierCertificateNewOptions
  | SetVerifierCertificateExistingOptions

export interface MnemonicMessages {
  // mnemonic message signatures
  "pri(mnemonic.subscribe)": [null, boolean, Mnemonic[]]
  "pri(mnemonic.unlock)": [MnemonicUnlockRequest, string]
  "pri(mnemonic.confirm)": [MnemonicConfirmRequest, boolean]
  "pri(mnemonic.rename)": [MnemonicRenameRequest, boolean]
  "pri(mnemonic.delete)": [MnemonicDeleteRequest, boolean]
  "pri(mnemonic.validateMnemonic)": [string, boolean]
  "pri(mnemonic.setVerifierCertMnemonic)": [RequestSetVerifierCertificateMnemonic, boolean]
}
