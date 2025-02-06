import type { KeypairCurve } from "@talismn/crypto"

import type {
  AccountBase,
  AccountContact,
  AccountLedgerEthereum,
  AccountLedgerPolkadot,
  AccountPolkadotVault,
  AccountWatchOnly,
} from "./account"

export type AddAccountExternalOptions =
  | Omit<AccountContact, "createdAt">
  | Omit<AccountWatchOnly, "createdAt">
  | Omit<AccountLedgerEthereum, "createdAt">
  | Omit<AccountLedgerPolkadot, "createdAt">
  | Omit<AccountPolkadotVault, "createdAt">

export type AddAccountDeriveOptions = Omit<AccountBase, "createdAt" | "address"> & {
  curve: KeypairCurve
  mnemonicId: string
  derivationPath: string
}

export type AddAccountKeypairOptions = Omit<AccountBase, "createdAt" | "address"> & {
  curve: KeypairCurve
  secretKey: Uint8Array
}

export type AddMnemonicOptions = {
  mnemonic: string
  name: string
  description: string
}
