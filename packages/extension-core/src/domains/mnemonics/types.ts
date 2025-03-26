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
  "pri(mnemonics.subscribe)": [null, boolean, Mnemonic[]]
  "pri(mnemonics.unlock)": [MnemonicUnlockRequest, string]
  "pri(mnemonics.confirm)": [MnemonicConfirmRequest, boolean]
  "pri(mnemonics.rename)": [MnemonicRenameRequest, boolean]
  "pri(mnemonics.delete)": [MnemonicDeleteRequest, boolean]
  "pri(mnemonics.validateMnemonic)": [string, boolean]
  "pri(mnemonics.setVerifierCertMnemonic)": [RequestSetVerifierCertificateMnemonic, boolean]
}
