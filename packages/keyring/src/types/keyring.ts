import type { KeypairCurve } from "@talismn/crypto"

import type {
  AccountBase,
  AccountContact,
  AccountLedgerBitcoin,
  AccountLedgerEthereum,
  AccountLedgerPolkadot,
  AccountLedgerSolana,
  AccountPolkadotVault,
  AccountSignet,
  AccountWatchOnly,
  AccountWatchOnlyBitcoin,
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

type NewMnemonicSource = {
  type: "new-mnemonic"
  mnemonic: string
  mnemonicName: string
  confirmed: boolean
}

type ExistingMnemonicSource = {
  type: "existing-mnemonic"
  mnemonicId: string
}

export type MnemonicSource = NewMnemonicSource | ExistingMnemonicSource

type DeriveFromMnemonicOptions = MnemonicSource & {
  curve: KeypairCurve
  derivationPath: string
}

export type AddAccountDeriveOptions = Omit<AccountBase, "createdAt" | "address"> &
  DeriveFromMnemonicOptions

export type AddAccountBitcoinOptions = Omit<AccountBase, "createdAt" | "address"> &
  MnemonicSource & {
    /** defaults to the next unused index for this mnemonic */
    accountIndex?: number
  }

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
  | Omit<AccountLedgerBitcoin, "createdAt">
  | Omit<AccountPolkadotVault, "createdAt">
  | Omit<AccountSignet, "createdAt">
  | Omit<AccountWatchOnlyBitcoin, "createdAt">

export type UpdateAccountOptions = {
  name?: string
  isPortfolio?: boolean
  genesisHash?: `0x${string}`
}
