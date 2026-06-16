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
import { isAddressEqual } from "@talismn/crypto"
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

// TODO: default tokens should be controlled from chaindata
const shouldDisplayBalance = (
  accounts: Account[] | undefined,
  networksById: Record<NetworkId, Network>,
  balances: Balances
) => {
  const accountHasSomeBalance =
    balances.find((b) => !accounts || accounts.some((a) => isAddressEqual(a.address, b.address)))
      .sum.planck.total > 0n

  return (balance: Balance): boolean => {
    const account = accounts?.find((a) => isAddressEqual(a.address, balance.address))
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
