import {
  type Account,
  isAccountLedgerPolkadotGeneric,
  isAccountOfType,
} from "@core/domains/keyring/exports"

export const canUseMevShield = (account: Account | null | undefined) =>
  isAccountOfType(account, "keypair") || isAccountLedgerPolkadotGeneric(account)
