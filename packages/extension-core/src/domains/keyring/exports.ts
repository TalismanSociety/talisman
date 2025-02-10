// export only types and type guards, they are needed by the front end
export type * from "@talismn/keyring"

export {
  isAccountOfType,
  isAccountEthereum,
  isAccountExternal,
  isAccountInTypes,
  isAccountOwned,
  isAccountPolkadot,
  isAccountPortfolio,
  isAccountLedgerPolkadotGeneric,
  isAccountLedgerPolkadotLegacy,
  getAccountGenesisHash,
} from "@talismn/keyring"
