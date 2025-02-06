import type { KeypairCurve } from "@talismn/crypto"

export type AccountPlatform = "ethereum" | "polkadot" | "solana" // bitcoin, cardano, etc. defined which signer can be used and how addresses are derived

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
  networkId?: string // indicates if network restricted
}

export type AccountWatchOnly = AccountBase & {
  type: "watch-only"
  isPortfolio: boolean
}

export type AccountLedgerPolkadot = AccountBase & {
  type: "ledger-polkadot"
  app: string // polkadot for generic, other value for legacy app
  accountIndex: number
  addressOffset: number
  genesisHash?: string // if defined, it's a legacy app
}

export type AccountLedgerEthereum = AccountBase & {
  type: "ledger-ethereum"
  derivationPath: string
}

export type AccountPolkadotVault = AccountBase & {
  type: "polkadot-vault"
  genesisHash?: string
}

// export type AccountHdSingle = AccountBase & {
//   type: "hd-single";
//   curve: KeypairCurve;
//   mnemonicId: string;
//   derivationPath: string;
//   address: string;
// };

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
  | AccountPolkadotVault

export type AccountType = Account["type"]
