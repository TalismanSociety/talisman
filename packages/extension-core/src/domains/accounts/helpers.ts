import type { InjectedAccount } from "@polkadot/extension-inject/types"
import { Chain } from "@talismn/chaindata-provider"
import { isAddressEqual, KeypairCurve } from "@talismn/crypto"
import {
  Account,
  getAccountGenesisHash,
  isAccountEthereum,
  isAccountLedgerPolkadotGeneric,
  isAccountNotContact,
} from "@talismn/keyring"

import { getEthDerivationPath } from "../ethereum/helpers"
import { getAccountKeypairType } from "../keyring/getKeypairTypeFromAccount"
import { AccountsCatalogStore } from "./store.catalog"

const sortAccountsByCreationDate = (acc1: Account, acc2: Account) => {
  const acc1Created = acc1.createdAt
  const acc2Created = acc2.createdAt

  if (!acc1Created || !acc2Created) {
    return 0
  }

  if (acc1Created > acc2Created) {
    return 1
  }

  if (acc1Created < acc2Created) {
    return -1
  }

  return 0
}

export const sortAccounts =
  (accountsCatalogStore: AccountsCatalogStore) =>
  async (accounts: Account[]): Promise<Account[]> => {
    const sorted = accounts.concat().sort(sortAccountsByCreationDate)

    // add any newly created accounts to the catalog
    // each new account will be placed at the end of the list
    await accountsCatalogStore.addAccounts(sorted.filter(isAccountNotContact))
    await accountsCatalogStore.sortAccountsByCatalogOrder(sorted)

    return sorted
  }

export const getPjsInjectedAccount = (
  account: Account,
  options = { includePortalOnlyInfo: false },
): InjectedAccount | (InjectedAccount & { readonly: boolean; partOfPortfolio: boolean }) => ({
  address: account.address,
  name: account.name,
  type: getAccountKeypairType(account),
  ...("genesisHash" in account && account.genesisHash ? { genesisHash: account.genesisHash } : {}),
  ...(options.includePortalOnlyInfo
    ? {
        readonly: account.type === "watch-only",
        partOfPortfolio: account.type === "watch-only" && account.isPortfolio,
      }
    : {}),
})

export const filterAccountsByAddresses =
  (addresses: string[] = [], anyType = false) =>
  (accounts: Account[]) => {
    return accounts
      .filter(({ address }) => addresses.some((a) => isAddressEqual(a, address)))
      .filter((acc) => {
        if (anyType) return true
        const type = getAccountKeypairType(acc)
        return ["ed25519", "sr25519", "ecdsa", "ethereum"].includes(type)
      })
  }

export const getPublicAccounts = (
  accounts: Account[],
  filterFn: (accounts: Account[]) => Account[] = (accounts) => accounts,
  options = { includeWatchedAccounts: false },
) =>
  filterFn(accounts)
    .filter((a) => a.type !== "contact")
    .filter((a) => options.includeWatchedAccounts || a.type !== "watch-only")
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)) // TODO apply catalog order ?
    .map((x) => getPjsInjectedAccount(x, { includePortalOnlyInfo: options.includeWatchedAccounts }))

export const getDerivationPathForCurve = (curve: KeypairCurve, accountIndex: number) => {
  switch (curve) {
    case "ecdsa":
    case "ed25519":
    case "sr25519":
      return `//${accountIndex}`

    case "ethereum":
      return getEthDerivationPath(accountIndex)

    default:
      throw Error("Not implemented")
  }
}

export const formatSuri = (mnemonic: string, derivationPath: string) =>
  derivationPath && !derivationPath.startsWith("/")
    ? `${mnemonic}/${derivationPath}`
    : `${mnemonic}${derivationPath}`

export const isCurveCompatibleWithChain = (
  chain: Chain,
  curve: KeypairCurve,
  genesisHash: `0x${string}` | null | undefined,
) => {
  if (genesisHash && genesisHash !== chain.genesisHash) return false
  return curve === "ethereum" ? chain.account === "secp256k1" : chain.account !== "secp256k1"
}

export const isAccountCompatibleWithChain = (chain: Chain, account: Account) => {
  const genesisHash = getAccountGenesisHash(account)
  if (genesisHash && genesisHash !== chain.genesisHash) return false
  if (isAccountLedgerPolkadotGeneric(account) && !chain.hasCheckMetadataHash) return false
  return isAccountEthereum(account) ? chain.account === "secp256k1" : chain.account !== "secp256k1"
}
