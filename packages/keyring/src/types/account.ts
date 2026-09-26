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

export type BitcoinAddressType = "p2wpkh" | "p2tr"

export type BitcoinKeyPath = {
  tree: "payments" | "ordinals"
  change: 0 | 1
  index: number
}

export type BitcoinAccountKeys = {
  /** BIP84 P2WPKH tree, ex "m/84'/0'/0'" */
  payments: { derivationPath: string; xpub: string }
  /** BIP86 P2TR tree, ex "m/86'/0'/0'" */
  ordinals: { derivationPath: string; xpub: string }
}

// bitcoin HD account: address = canonical payments xpub, on-chain addresses and
// child keys are derived dynamically (never stored)
export type AccountHdBitcoin = AccountBase & {
  type: "hd-bitcoin"
  mnemonicId: string
  accountIndex: number
  masterFingerprint: `0x${string}`
  keys: BitcoinAccountKeys
}

export type AccountLedgerBitcoin = AccountBase & {
  type: "ledger-bitcoin"
  accountIndex: number
  masterFingerprint: `0x${string}`
  keys: BitcoinAccountKeys
}

// watches a single pasted xpub — one tree only, no ordinals counterpart
export type AccountWatchOnlyBitcoin = AccountBase & {
  type: "watch-only-bitcoin"
  isPortfolio: boolean
  addressType: BitcoinAddressType
}

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
  | AccountHdBitcoin
  | AccountLedgerBitcoin
  | AccountWatchOnlyBitcoin

export type AccountType = Account["type"]
