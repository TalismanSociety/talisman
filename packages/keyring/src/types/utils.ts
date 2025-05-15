import {
  detectAddressEncoding,
  isBitcoinAddress,
  isEthereumAddress,
  platformFromAddress,
  platformFromCurve,
} from "@talismn/crypto"

import type { Account, AccountLedgerPolkadot, AccountType } from "./account"

export type AccountOfType<Type extends AccountType> = Extract<Account, { type: Type }>

export const isAccountOfType = <Type extends AccountType>(
  account: Account | null | undefined,
  type: Type,
): account is AccountOfType<Type> => {
  return account?.type === type
}

export const isAccountInTypes = <Types extends AccountType[]>(
  account: Account | null | undefined,
  types: Types,
): account is AccountOfType<Types[number]> => {
  return !!account && types.includes(account.type)
}

const ACCOUNT_TYPES_OWNED = [
  "keypair",
  "ledger-ethereum",
  "ledger-polkadot",
  "polkadot-vault",
] as const

const ACCOUNT_TYPES_EXTERNAL = [
  "contact",
  "watch-only",
  "ledger-ethereum",
  "ledger-polkadot",
  "polkadot-vault",
  "signet",
] as const

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ACCOUNT_TYPES_ETHEREUM = ["contact", "watch-only", "keypair", "ledger-ethereum"] as const

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ACCOUNT_TYPES_POLKADOT = [
  "contact",
  "watch-only",
  "keypair",
  "ledger-polkadot",
  "polkadot-vault",
  "signet",
] as const

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ACCOUNT_TYPES_BITCOIN = ["contact", "watch-only"] as const

export const isAccountExternal = (
  account: Account | null | undefined,
): account is AccountOfType<(typeof ACCOUNT_TYPES_EXTERNAL)[number]> => {
  return isAccountInTypes(account, ACCOUNT_TYPES_EXTERNAL as unknown as AccountType[])
}

export const isAccountOwned = (
  account: Account | null | undefined,
): account is AccountOfType<(typeof ACCOUNT_TYPES_OWNED)[number]> => {
  return isAccountInTypes(account, ACCOUNT_TYPES_OWNED as unknown as AccountType[])
}

export const isAccountPortfolio = (account: Account | null | undefined): account is Account => {
  return isAccountOwned(account) || (isAccountOfType(account, "watch-only") && account.isPortfolio)
}

export const isAccountNotContact = (acc: Account) => acc.type !== "contact"

type AccountEthereum = Extract<Account, { type: (typeof ACCOUNT_TYPES_ETHEREUM)[number] }> & {
  address: `0x${string}`
}
export const isAccountEthereum = (
  account: Account | null | undefined,
): account is AccountEthereum => {
  return !!account && isEthereumAddress(account.address)
}

type AccountPolkadot = Extract<Account, { type: (typeof ACCOUNT_TYPES_POLKADOT)[number] }> & {
  genesisHash?: `0x${string}`
}
export const isAccountPolkadot = (
  account: Account | null | undefined,
): account is AccountPolkadot => {
  return !!account && detectAddressEncoding(account.address) === "ss58"
}

export const isAccountLedgerPolkadotGeneric = (
  account: Account | null | undefined,
): account is AccountLedgerPolkadot & { genesisHash: undefined } => {
  return isAccountOfType(account, "ledger-polkadot") && !account.genesisHash
}

export const isAccountLedgerPolkadotLegacy = (
  account: Account | null | undefined,
): account is AccountLedgerPolkadot & { genesisHash: `0x${string}` } => {
  return isAccountOfType(account, "ledger-polkadot") && !!account.genesisHash
}

type AccountBitcoin = Extract<Account, { type: (typeof ACCOUNT_TYPES_BITCOIN)[number] }>
export const isAccountBitcoin = (
  account: Account | null | undefined,
): account is AccountBitcoin => {
  return !!account && isBitcoinAddress(account.address)
}

export const getAccountGenesisHash = (account: Account | null | undefined) => {
  if (!account) return undefined
  return "genesisHash" in account ? account.genesisHash || undefined : undefined
}

export const getAccountSignetUrl = (account: Account | null | undefined) => {
  return isAccountOfType(account, "signet") ? account.url : undefined
}

export const getAccountPlatform = (account: Account | null | undefined) => {
  if (!account) return undefined
  return "curve" in account
    ? platformFromCurve(account.curve)
    : platformFromAddress(account.address)
}
