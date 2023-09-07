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

export type VerifierCertificateType = "existing" | "import" | null

export type RequestSetVerifierCertificateMnemonic = {
  type: VerifierCertificateType
  mnemonic?: string
  mnemonicId?: string
}

export interface MnemonicMessages {
  // mnemonic message signatures
  "pri(mnemonic.unlock)": [MnemonicUnlockRequest, string]
  "pri(mnemonic.confirm)": [MnemonicConfirmRequest, boolean]
  "pri(mnemonic.rename)": [MnemonicRenameRequest, boolean]
  "pri(mnemonic.delete)": [MnemonicDeleteRequest, boolean]
  "pri(mnemonic.validateMnemonic)": [string, boolean]
  "pri(mnemonic.setVerifierCertMnemonic)": [RequestSetVerifierCertificateMnemonic, boolean]
}
