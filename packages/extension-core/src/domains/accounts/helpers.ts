import type { InjectedAccount } from "@polkadot/extension-inject/types"
import { DotNetwork, Network } from "@talismn/chaindata-provider"
import {
  AccountPlatform,
  getAccountPlatformFromAddress,
  isAddressEqual,
  KeypairCurve,
} from "@talismn/crypto"
import {
  Account,
  getAccountGenesisHash,
  isAccountAddressEthereum,
  isAccountAddressSs58,
  isAccountLedgerPolkadotGeneric,
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
  isAccountPlatformSolana,
} from "@talismn/keyring"
import { log } from "extension-shared"

import { getEthDerivationPath } from "../ethereum/helpers"
import { getAccountKeypairType } from "../keyring/getKeypairTypeFromAccount"
import { AccountsCatalogStore } from "./store.catalog"

export const SUPPORTED_ACCOUNT_PLATFORMS: AccountPlatform[] = ["ethereum", "polkadot", "solana"]

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
    await accountsCatalogStore.syncAccounts(sorted)
    await accountsCatalogStore.sortAccountsByCatalogOrder(sorted)

    return sorted
  }

const getInjectedAccountType = (account: Account): InjectedAccount["type"] => {
  if (isAccountAddressEthereum(account)) return "ethereum"
  // some dapps pass only sr25519 as filter
  if (isAccountAddressSs58(account)) return "sr25519"
  throw new Error("Unsupported account type")
}

export const getPjsInjectedAccount = (
  account: Account,
  options = { includePortalOnlyInfo: false },
): InjectedAccount | (InjectedAccount & { readonly: boolean; partOfPortfolio: boolean }) => {
  const genesisHash = getAccountGenesisHash(account)
  return {
    address: account.address,
    name: account.name,
    type: getInjectedAccountType(account),
    ...(genesisHash ? { genesisHash } : {}),
    ...(options.includePortalOnlyInfo
      ? {
          readonly: account.type === "watch-only",
          partOfPortfolio: account.type === "watch-only" && account.isPortfolio,
        }
      : {}),
  }
}

export const filterAccountsByAddresses =
  (addresses: string[] = [], anyType = false) =>
  (accounts: Account[]) => {
    return accounts
      .filter((acc) => isAccountPlatformEthereum(acc) || isAccountPlatformPolkadot(acc))
      .filter(({ address }) => addresses.some((a) => isAddressEqual(a, address)))
      .filter((acc) => {
        if (anyType) return true
        const type = getAccountKeypairType(acc)
        return ["ed25519", "sr25519", "ecdsa", "ethereum"].includes(type)
      })
  }

type GetPublicAccountsOptions = {
  developerMode?: boolean
  includePortalOnlyInfo?: boolean
}

// should only be used for polkadot & ethereum accounts
export const getPublicAccounts = (
  accounts: Account[],
  filterFn: (accounts: Account[]) => Account[] = (accounts) => accounts,
  options: GetPublicAccountsOptions = {
    developerMode: false,
    includePortalOnlyInfo: false,
  },
) =>
  filterFn(accounts)
    .filter((a) => isAccountPlatformEthereum(a) || isAccountPlatformPolkadot(a))
    .filter((a) => {
      if (options.developerMode) return true
      if (options.includePortalOnlyInfo) return a.type !== "contact"
      return !["watch-only", "contact"].includes(a.type)
    })
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)) // TODO apply catalog order ?
    .map((x) =>
      getPjsInjectedAccount(x, { includePortalOnlyInfo: !!options.includePortalOnlyInfo }),
    )

export const getDefaultCurveForAccountPlatform = (platform: AccountPlatform): KeypairCurve => {
  switch (platform) {
    case "ethereum":
      return "ethereum"
    case "polkadot":
      return "sr25519"
    case "solana":
      return "solana"
    default:
      throw new Error("Unsupported account platform")
  }
}

export const getDerivationPathForCurve = (curve: KeypairCurve, accountIndex?: number) => {
  switch (curve) {
    case "ecdsa":
    case "ed25519":
    case "sr25519":
      return typeof accountIndex === "number" ? `//${accountIndex}` : ""

    case "ethereum":
      return getEthDerivationPath(accountIndex)

    case "solana":
      return getSolDerivationPath(accountIndex ?? 0)

    default:
      throw Error("Not implemented")
  }
}

const getSolDerivationPath = (accountIndex: number) => {
  return `m/44'/501'/${accountIndex}'/0'`
}

export const isCurveCompatibleWithChain = (
  chain: DotNetwork,
  curve: KeypairCurve,
  genesisHash: `0x${string}` | null | undefined,
) => {
  if (genesisHash && genesisHash !== chain.genesisHash) return false
  return curve === "ethereum" ? chain.account === "secp256k1" : chain.account !== "secp256k1"
}

const isAccountCompatibleWithDotNetwork = (chain: DotNetwork, account: Account) => {
  // consider only substrate and ethereum accounts
  if (!isAccountPlatformPolkadot(account) && !isAccountPlatformEthereum(account)) return false
  // except ethereum ledger accounts which can't sign substrate payloads
  if (account.type === "ledger-ethereum") return false

  // check if account is compatible with chain specifics
  const genesisHash = getAccountGenesisHash(account)
  if (genesisHash && genesisHash !== chain.genesisHash) return false
  if (isAccountLedgerPolkadotGeneric(account) && !chain.hasCheckMetadataHash) return false
  return isAccountAddressEthereum(account)
    ? chain.account === "secp256k1"
    : chain.account !== "secp256k1"
}

export const isAccountCompatibleWithNetwork = (network: Network, account: Account) => {
  switch (network.platform) {
    case "ethereum":
      return isAccountPlatformEthereum(account)
    case "polkadot":
      return isAccountCompatibleWithDotNetwork(network, account)
    case "solana":
      return isAccountPlatformSolana(account)
    default:
      log.warn("Unsupported network platform", network)
      throw new Error("Unsupported network platform")
  }
}

export const isAccountPlatformCompatibleWithNetwork = (
  network: Network,
  platform: AccountPlatform,
) => {
  switch (network.platform) {
    case "ethereum":
      return platform === "ethereum"
    case "solana":
      return platform === "solana"
    case "polkadot": {
      switch (network.account) {
        case "secp256k1":
          return platform === "ethereum"
        case "*25519":
          return platform === "polkadot"
        default:
          throw new Error(`Unsupported polkadot network account type ${network.account}`)
      }
    }
    default:
      log.warn("Unsupported network platform", network)
      throw new Error("Unsupported network platform")
  }
}

/**
 * If this is the address of an account, use isAccountCompatibleWithChain instead.
 * Otherwise it could lead to a loss of funds
 * @param chain
 * @param address
 * @returns
 */
export const isAddressCompatibleWithNetwork = (network: Network, address: string) => {
  const accountPlatform = getAccountPlatformFromAddress(address)
  return isAccountPlatformCompatibleWithNetwork(network, accountPlatform)
}
