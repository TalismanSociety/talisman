import type { InjectedAccount } from "@polkadot/extension-inject/types"
import keyring from "@polkadot/ui-keyring"
import { hexToU8a, isHex } from "@polkadot/util"
import { KeypairType } from "@polkadot/util-crypto/types"
import { captureException } from "@sentry/browser"
import { Chain } from "@talismn/chaindata-provider"
import { KeypairCurve } from "@talismn/crypto"
import { Account, isAccountEthereum } from "@talismn/keyring"
import { decodeAnyAddress, encodeAnyAddress } from "@talismn/util"
import { log } from "extension-shared"
import { Err, Ok, Result } from "ts-results"

import type { Address } from "../../types/base"
import { addressFromSuri } from "../../util/addressFromSuri"
import { getEthDerivationPath } from "../ethereum/helpers"
import { AccountsCatalogStore } from "./store.catalog"
import { LegacyAccount, LegacyAccountOrigin } from "./types"

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
    await accountsCatalogStore.addAccounts(sorted)
    await accountsCatalogStore.sortAccountsByCatalogOrder(sorted)

    return sorted
  }

export const getPjsInjectedAccount = (
  account: Account,
  options = { includePortalOnlyInfo: false },
): InjectedAccount | (InjectedAccount & { readonly: boolean; partOfPortfolio: boolean }) => ({
  address: account.address,
  genesisHash: "genesisHash" in account ? account.genesisHash : undefined,
  name: account.name,
  type: "curve" in account ? (account.curve as KeypairType) : undefined,
  ...(options.includePortalOnlyInfo
    ? {
        readonly: account.type === "watch-only",
        partOfPortfolio: account.type === "watch-only" && account.isPortfolio,
      }
    : {}),
})

export const filterAccountsByAddresses =
  (addresses: string[] = [], anyType = false) =>
  (accounts: Account[]) =>
    accounts
      .filter(({ address }) => !!addresses.includes(address))
      .filter((acc) =>
        anyType
          ? true
          : "curve" in acc
            ? ["ed25519", "sr25519", "ecdsa", "ethereum"].includes(acc.curve) // from pjs's canDerive(type)
            : false,
      )

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
    // substrate
    case "ecdsa":
    case "ed25519":
    case "sr25519":
      return `//${accountIndex}`

    case "ethereum":
      return getEthDerivationPath(accountIndex)

    case "solana":
      throw Error("Not implemented")
  }
}

/**
 * @deprecated
 */
export const getNextDerivationPathForMnemonic = (
  mnemonic: string,
  type: KeypairType = "sr25519",
): Result<
  string,
  "Unable to get next derivation path" | "Reached maximum number of derived accounts"
> => {
  const allAccounts = keyring.getAccounts()
  try {
    // for substrate check empty derivation path first
    if (type !== "ethereum") {
      const derivedAddress = encodeAnyAddress(addressFromSuri(mnemonic, type))
      if (!allAccounts.some(({ address }) => encodeAnyAddress(address) === derivedAddress))
        return Ok("")
    }

    const getDerivationPath = (accountIndex: number) =>
      type === "ethereum" ? getEthDerivationPath(accountIndex) : `//${accountIndex}`

    for (let accountIndex = 0; accountIndex <= 1000; accountIndex += 1) {
      const derivationPath = getDerivationPath(accountIndex)
      const derivedAddress = encodeAnyAddress(addressFromSuri(`${mnemonic}${derivationPath}`, type))

      if (!allAccounts.some(({ address }) => encodeAnyAddress(address) === derivedAddress))
        return Ok(derivationPath)
    }

    return Err("Reached maximum number of derived accounts")
  } catch (error) {
    log.error("Unable to get next derivation path", error)
    captureException(error)
    return Err("Unable to get next derivation path")
  }
}

export const hasQrCodeAccounts = async () => {
  const localData = await chrome.storage.local.get(null)
  return Object.entries(localData).some(
    ([key, account]: [string, LegacyAccount]) =>
      key.startsWith("account:0x") && account.meta?.origin === LegacyAccountOrigin.Qr,
  )
}

export const hasPrivateKey = (address: Address) => {
  const acc = keyring.getAccount(address)

  if (!acc) return false
  if (acc.meta?.isExternal) return false
  if (acc.meta?.isHardware) return false
  if (
    [LegacyAccountOrigin.Qr, LegacyAccountOrigin.Watched].includes(
      acc.meta?.origin as LegacyAccountOrigin,
    )
  )
    return false
  return true
}

export const isValidAnyAddress = (address: string) => {
  try {
    // validates both SS58 and ethereum addresses
    encodeAnyAddress(isHex(address) ? hexToU8a(address) : decodeAnyAddress(address))

    return true
  } catch (error) {
    return false
  }
}

export const formatSuri = (mnemonic: string, derivationPath: string) =>
  derivationPath && !derivationPath.startsWith("/")
    ? `${mnemonic}/${derivationPath}`
    : `${mnemonic}${derivationPath}`

export const isAccountCompatibleWithChainOld = (
  chain: Chain,
  type: KeypairType,
  genesisHash: `0x${string}` | null | undefined,
) => {
  if (genesisHash && genesisHash !== chain.genesisHash) return false
  return type === "ethereum" ? chain.account === "secp256k1" : chain.account !== "secp256k1"
}

export const isAccountCompatibleWithChain = (chain: Chain, account: Account) => {
  const genesisHash = "genesisHash" in account ? account.genesisHash : undefined
  if (genesisHash && genesisHash !== chain.genesisHash) return false
  return isAccountEthereum(account) ? chain.account === "secp256k1" : chain.account !== "secp256k1"
}

export const isOwnedAccountOrigin = (origin: LegacyAccountOrigin) => {
  switch (origin) {
    case LegacyAccountOrigin.Watched:
    case LegacyAccountOrigin.Signet:
      return false
    default:
      return true
  }
}
