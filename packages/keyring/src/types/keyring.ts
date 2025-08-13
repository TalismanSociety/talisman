import type { KeypairCurve } from "@talismn/crypto"

import type {
  AccountBase,
  AccountContact,
  AccountLedgerEthereum,
  AccountLedgerPolkadot,
  AccountLedgerSolana,
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

type DeriveFromNewMnemonic = {
  type: "new-mnemonic"
  mnemonic: string
  mnemonicName: string
  confirmed: boolean
  curve: KeypairCurve
  derivationPath: string
}

type DeriveFromExistingMnemonic = {
  type: "existing-mnemonic"
  mnemonicId: string
  curve: KeypairCurve
  derivationPath: string
}

type DeriveFromMnemonicOptions = DeriveFromNewMnemonic | DeriveFromExistingMnemonic

export type AddAccountDeriveOptions = Omit<AccountBase, "createdAt" | "address"> &
  DeriveFromMnemonicOptions

export type AddAccountKeypairOptions = Omit<AccountBase, "createdAt" | "address"> & {
  curve: KeypairCurve
  secretKey: Uint8Array
}

export type AddAccountExternalOptions =
  | Omit<AccountContact, "createdAt">
  | Omit<AccountWatchOnly, "createdAt">
  | Omit<AccountLedgerEthereum, "createdAt">
  | Omit<AccountLedgerPolkadot, "createdAt">
  | Omit<AccountLedgerSolana, "createdAt">
  | Omit<AccountPolkadotVault, "createdAt">
  | Omit<AccountSignet, "createdAt">

export type UpdateAccountOptions = {
  name?: string
  isPortfolio?: boolean
  genesisHash?: `0x${string}`
}
