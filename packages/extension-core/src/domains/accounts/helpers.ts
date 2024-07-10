import { canDerive } from "@polkadot/extension-base/utils"
import type { InjectedAccount } from "@polkadot/extension-inject/types"
import keyring from "@polkadot/ui-keyring"
import type { SingleAddress, SubjectInfo } from "@polkadot/ui-keyring/observable/types"
import { hexToU8a, isHex } from "@polkadot/util"
import { KeypairType } from "@polkadot/util-crypto/types"
import { captureException } from "@sentry/browser"
import { Chain } from "@talismn/chaindata-provider"
import { decodeAnyAddress, encodeAnyAddress } from "@talismn/util"
import { log } from "extension-shared"
import { Err, Ok, Result } from "ts-results"

import type { Address } from "../../types/base"
import { addressFromSuri } from "../../util/addressFromSuri"
import { getEthDerivationPath } from "../ethereum/helpers"
import { AccountsCatalogStore } from "./store.catalog"
import { Account, AccountJsonAny, AccountType } from "./types"

const sortAccountsByWhenCreated = (acc1: AccountJsonAny, acc2: AccountJsonAny) => {
  const acc1Created = acc1.whenCreated
  const acc2Created = acc2.whenCreated

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
  async (keyringAccounts: SubjectInfo): Promise<AccountJsonAny[]> => {
    const accounts = Object.values(keyringAccounts)
      .map(
        ({ json: { address, meta }, type }): AccountJsonAny => ({
          address,
          ...meta,
          type,
        })
      )
      .sort(sortAccountsByWhenCreated)

    // add any newly created accounts to the catalog
    // each new account will be placed at the end of the list
    await accountsCatalogStore.addAccounts(accounts)
    await accountsCatalogStore.sortAccountsByCatalogOrder(accounts)

    return accounts
  }

export const getInjectedAccount = (
  {
    json: {
      address,
      meta: { genesisHash, name, origin, isPortfolio },
    },
    type,
  }: SingleAddress,
  options = { includePortalOnlyInfo: false }
): InjectedAccount | (InjectedAccount & { readonly: boolean; partOfPortfolio: boolean }) => ({
  address,
  genesisHash,
  name,
  type,
  ...(options.includePortalOnlyInfo
    ? {
        readonly: origin === AccountType.Watched,
        partOfPortfolio: isPortfolio,
      }
    : {}),
})

export const filterAccountsByAddresses =
  (addresses: string[] = [], anyType = false) =>
  (accounts: SingleAddress[]) =>
    accounts
      .filter(({ json: { address } }) => !!addresses.includes(address))
      .filter(({ type }) => (anyType ? true : canDerive(type)))

export const getPublicAccounts = (
  accounts: SingleAddress[],
  filterFn: (accounts: SingleAddress[]) => SingleAddress[] = (accounts) => accounts,
  options = { includeWatchedAccounts: false }
) =>
  filterFn(accounts)
    .filter(
      (a) =>
        options.includeWatchedAccounts ||
        ![AccountType.Watched, AccountType.Dcent].includes(a.json.meta.origin as AccountType)
    )
    .sort((a, b) => (a.json.meta.whenCreated || 0) - (b.json.meta.whenCreated || 0))
    .map((x) => getInjectedAccount(x, { includePortalOnlyInfo: options.includeWatchedAccounts }))

export const getNextDerivationPathForMnemonic = (
  mnemonic: string,
  type: KeypairType = "sr25519"
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
    ([key, account]: [string, Account]) =>
      key.startsWith("account:0x") && account.meta?.origin === AccountType.Qr
  )
}

export const hasPrivateKey = (address: Address) => {
  const acc = keyring.getAccount(address)

  if (!acc) return false
  if (acc.meta?.isExternal) return false
  if (acc.meta?.isHardware) return false
  if ([AccountType.Qr, AccountType.Watched].includes(acc.meta?.origin as AccountType)) return false
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

export const isAccountCompatibleWithChain = (
  chain: Chain,
  type: KeypairType,
  genesisHash: `0x${string}` | null | undefined
) => {
  if (genesisHash && genesisHash !== chain.genesisHash) return false
  return type === "ethereum" ? chain.account === "secp256k1" : chain.account !== "secp256k1"
}
