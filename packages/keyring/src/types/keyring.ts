import type { KeypairCurve } from "@talismn/crypto"

import type {
  AccountBase,
  AccountContact,
  AccountLedgerEthereum,
  AccountLedgerPolkadot,
  AccountPolkadotVault,
  AccountSignet,
  AccountWatchOnly,
} from "./account"

export type AddMnemonicOptions = {
  mnemonic: string
  name: string
  confirmed: boolean
}

export type UpdateMnemonicOptions = {
  name?: string
  confirmed?: boolean
}

export type AddAccountExternalOptions =
  | Omit<AccountContact, "createdAt">
  | Omit<AccountWatchOnly, "createdAt">
  | Omit<AccountLedgerEthereum, "createdAt">
  | Omit<AccountLedgerPolkadot, "createdAt">
  | Omit<AccountPolkadotVault, "createdAt">
  | Omit<AccountSignet, "createdAt">

export type AddAccountDeriveOptions = Omit<AccountBase, "createdAt" | "address"> & {
  curve: KeypairCurve
  mnemonicId: string
  derivationPath: string
}

export type AddAccountKeypairOptions = Omit<AccountBase, "createdAt" | "address"> & {
  curve: KeypairCurve
  secretKey: Uint8Array
}

export type UpdateAccountOptions = {
  name?: string
  isPortfolio?: boolean
}
