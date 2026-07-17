import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import type { Account } from "@core/domains/keyring/exports"
import {
  getAccountGenesisHash,
  isAccountAddressEthereum,
  isAccountAddressSs58,
} from "@core/domains/keyring/exports"
import { bind } from "@react-rxjs/core"
import { type Balance, Balances } from "@talismn/balances"
import {
  evmNativeTokenId,
  getNetworkGenesisHash,
  type Network,
  type NetworkId,
  subNativeTokenId,
} from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import { getNetworksMapById$, useNetworksMapById } from "@ui/state/chaindata"
import {
  portfolioBalances$,
  portfolioSelectedAccounts$,
  usePortfolioSelectedAccounts,
} from "@ui/state/portfolio"
import { useMemo } from "react"
import { combineLatest, map } from "rxjs"

const DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE = [
  subNativeTokenId("polkadot"),
  subNativeTokenId("kusama"),
  subNativeTokenId("bittensor"),
]

const DEFAULT_PORTFOLIO_TOKENS_ETHEREUM = [evmNativeTokenId("1")]

// address normalization ss58-decodes: far too expensive to run per (balance × account)
// on every filter pass. Addresses are a small bounded set (wallet accounts + contacts),
// so cache normalizations across calls.
const normalizeCache = new Map<string, string | null>()
const safeNormalizeAddress = (address: string): string | null => {
  let normalized = normalizeCache.get(address)
  if (normalized === undefined) {
    try {
      normalized = normalizeAddress(address)
    } catch {
      normalized = null
    }
    if (normalizeCache.size > 10_000) normalizeCache.clear()
    normalizeCache.set(address, normalized)
  }
  return normalized
}

// TODO: default tokens should be controlled from chaindata
const shouldDisplayBalance = (
  accounts: Account[] | undefined,
  networksById: Record<NetworkId, Network>,
  balances: Balances
) => {
  const accountByNormalized = accounts
    ? new Map(
        accounts.flatMap((account) => {
          const normalized = safeNormalizeAddress(account.address)
          return normalized ? ([[normalized, account]] as const) : []
        })
      )
    : null
  const findAccount = (address: string): Account | undefined => {
    if (!accountByNormalized) return undefined
    const normalized = safeNormalizeAddress(address)
    return normalized ? accountByNormalized.get(normalized) : undefined
  }

  // single pass, mirror-filtered to match
  // balances.find(<matches accounts>).sum.planck.total > 0n
  const matched = accountByNormalized
    ? balances.each.filter((b) => !!findAccount(b.address))
    : balances.each
  const matchedTokenIds = new Set(matched.map((b) => b.tokenId))
  const accountHasSomeBalance = matched.some((b) => {
    const mirrorOf = b.token?.mirrorOf
    if (mirrorOf && matchedTokenIds.has(mirrorOf)) return false
    return b.total.planck > 0n
  })

  return (balance: Balance): boolean => {
    const account = findAccount(balance.address)
    if (!account) return false

    const network = networksById[balance.networkId]
    if (!network) return false

    // hide balances incompatible with the account
    // ex don't show substrate balances for ledger ethereum accounts (MOVR, GLMR etc exist on both sides)
    if (!isAccountCompatibleWithNetwork(network, account)) return false

    // locked-only balances have a zero total but must be displayed
    // (eg dtao conviction locks, reported on the subnet's base token)
    const hasNonZeroBalance = balance.total.planck > 0 || balance.locked.planck > 0n
    if (hasNonZeroBalance) return true

    // only show DEFAULT_TOKENS if account has no balance
    if (!accountHasSomeBalance) {
      const isSubstrateAccount = isAccountAddressSs58(account)
      const isSubstrateToken = DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE.includes(balance.tokenId)
      if (isSubstrateAccount && isSubstrateToken) return true

      const isEthereumAccount = !account || isAccountAddressEthereum(account)
      const isEthereumToken = DEFAULT_PORTFOLIO_TOKENS_ETHEREUM.includes(balance.tokenId)
      if (isEthereumAccount && isEthereumToken) return true
    }

    const genesisHash = getAccountGenesisHash(account)
    if (genesisHash && genesisHash === getNetworkGenesisHash(network))
      return balance.token?.type === "substrate-native" || balance.total.planck > 0n

    return false
  }
}

export const [usePortfolioDisplayBalances, portfolioDisplayBalances$] = bind(
  (filter: "all" | "network" | "search") =>
    combineLatest([portfolioBalances$, getNetworksMapById$(), portfolioSelectedAccounts$]).pipe(
      map(([{ networkBalances, allBalances, searchBalances }, networksById, accounts]) => {
        switch (filter) {
          case "all":
            return networkBalances.find(shouldDisplayBalance(accounts, networksById, allBalances))
          case "network":
            return networkBalances.find(
              shouldDisplayBalance(accounts, networksById, networkBalances)
            )
          case "search":
            return searchBalances.find(shouldDisplayBalance(accounts, networksById, searchBalances))
        }
      })
    ),
  new Balances([])
)

/**
 * @deprecated use atoms
 */
export const useDisplayBalances = (balances: Balances) => {
  const accounts = usePortfolioSelectedAccounts()
  const networksById = useNetworksMapById()

  return useMemo(
    () => balances.find(shouldDisplayBalance(accounts, networksById, balances)),
    [accounts, balances, networksById]
  )
}
