import type { KeypairCurve } from "@talismn/crypto"

export type LedgerPolkadotCurve = "ed25519" | "ethereum"

export type AccountBase = {
  // address edge-cases:
  // for polkadot, store the the 42 prefixed address (ex 5GrwvaEF...)
  // for bitcoin, store the xPub
  address: string
  name: string
  createdAt: number
}

export type AccountKeypair = AccountBase & {
  type: "keypair"
  curve: KeypairCurve
  mnemonicId?: string
  derivationPath?: string
}

export type AccountContact = AccountBase & {
  type: "contact"
  genesisHash?: `0x${string}`
}

export type AccountWatchOnly = AccountBase & {
  type: "watch-only"
  isPortfolio: boolean
}

export type AccountLedgerPolkadot = AccountBase & {
  type: "ledger-polkadot"
  curve: LedgerPolkadotCurve // ed25519 or secp256k1
  app: string // polkadot for generic, other value for migration app. used to determine derivation path. ignored for legacy apps.
  accountIndex: number
  addressOffset: number
  genesisHash?: `0x${string}` // if defined, it's a legacy app
}

export type AccountLedgerEthereum = AccountBase & {
  type: "ledger-ethereum"
  derivationPath: string
}

export type AccountLedgerSolana = AccountBase & {
  type: "ledger-solana"
  derivationPath: string
}

export type AccountPolkadotVault = AccountBase & {
  type: "polkadot-vault"
  genesisHash: `0x${string}` | null
}

export type AccountSignet = AccountBase & {
  type: "signet"
  genesisHash: `0x${string}`
  url: string // usually https://signet.talisman.xyz or https://polkadotmultisig.com/
}

// Idea: dynamically derived account
// export type AccountHdSingle = AccountBase & {
//   type: "hd-single";
//   curve: KeypairCurve;
//   mnemonicId: string;
//   derivationPath: string;
//   address: string;
// };

// Idea: bitcoin account with UTXOs support
// export type AccountHdBitcoin = AccountBase & {
//   type: "hd-bitcoin";
//   curve: KeypairCurve;
//   mnemonicId: string;
//   baseDerivationPath: string; // ex "m/84'/0'/0'" (change and address index will be generated dynamically when fetching keys)
//   xPub: string;
// };

// @dev: when adding a new type here, consider adding it's type to either OWNED_ACCOUNT_TYPES or EXTERNAL_ACCOUNT_TYPES in ../types/utils.ts
export type Account =
  | AccountKeypair
  | AccountContact
  | AccountWatchOnly
  | AccountLedgerEthereum
  | AccountLedgerPolkadot
  | AccountLedgerSolana
  | AccountPolkadotVault
  | AccountSignet

export type AccountType = Account["type"]
