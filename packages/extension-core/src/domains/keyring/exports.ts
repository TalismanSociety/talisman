// export only types and type guards, they are needed by the front end
export type * from "@talismn/keyring"

export {
  isAccountOfType,
  isAccountAddressEthereum,
  isAccountPlatformEthereum,
  isAccountExternal,
  isAccountInTypes,
  isAccountOwned,
  isAccountAddressSs58,
  isAccountPlatformPolkadot,
  isAccountPortfolio,
  isAccountLedgerPolkadotGeneric,
  isAccountLedgerPolkadotLegacy,
  isAccountBitcoin,
  isAccountNotContact,
  getAccountGenesisHash,
  getAccountSignetUrl,
  isAccountPlatformSolana,
} from "@talismn/keyring"
