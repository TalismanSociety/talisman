// Types in this file are not exported at the package level

import type {
  AccountContact,
  AccountHdBitcoin,
  AccountKeypair,
  AccountLedgerBitcoin,
  AccountLedgerEthereum,
  AccountLedgerPolkadot,
  AccountLedgerSolana,
  AccountPolkadotVault,
  AccountSignet,
  AccountWatchOnly,
  AccountWatchOnlyBitcoin,
} from "../types/account"
import type { Mnemonic } from "../types/mnemonic"

export type MnemonicStorage = Mnemonic & {
  entropy: string // encrypted entropy (which can be used to regenerate the mnemonic from any word list)
}

export type AccountKeypairStorage = AccountKeypair & {
  secretKey: string // encrypted secret key
}

export type AccountStorage =
  | AccountKeypairStorage // this is the only one that is different
  | AccountContact
  | AccountWatchOnly
  | AccountLedgerEthereum
  | AccountLedgerPolkadot
  | AccountLedgerSolana
  | AccountPolkadotVault
  | AccountSignet
  // hd-bitcoin stores no secret: child keys are re-derived from the mnemonic at sign time
  | AccountHdBitcoin
  | AccountLedgerBitcoin
  | AccountWatchOnlyBitcoin
