import {
  isAccountCompatibleWithNetwork,
  isAddressCompatibleWithNetwork,
} from "@core/domains/accounts/helpers"
import {
  isAccountAddressEthereum,
  isAccountAddressSs58,
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
  isAccountPlatformSolana,
} from "@core/domains/keyring/exports"
import { isAddressEqual } from "@talismn/crypto"
import { useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useCallback, useEffect, useMemo, useRef } from "react"

/** Derive networkType from a Talisman Token type */
const getNetworkType = (token: { type: string; platform?: string } | null | undefined) => {
  if (!token) return null
  if (token.platform === "ethereum") return "evm" as const
  if (token.platform === "polkadot") return "substrate" as const
  if (token.platform === "solana") return "solana" as const
  return null
}

/** Derive networkId (chainId) for useNetworkById from a Token */
const getNetworkId = (token: { type: string; networkId?: string } | null | undefined) => {
  if (!token) return ""
  return token.networkId ?? ""
}

/**
 * Unified address management for swaps.
 *
 * Replaces the old 5 separate address states with a simple {from, to} pair.
 * Platform-specific logic is derived from the Talisman Token type at consumption time.
 */
export function useSwapAddresses({
  fromAddress,
  setFromAddress,
  toAddress,
  setToAddress,
  fromTokenId,
  toTokenId,
}: {
  fromAddress: string | null
  setFromAddress: (v: string | null) => void
  toAddress: string | null
  setToAddress: (v: string | null) => void
  fromTokenId: string | null
  toTokenId: string | null
}) {
  // TODO: Support signet accounts
  const allAccounts = useAccounts()
  const ownedAccounts = useAccounts("owned")
  const balances = useBalances()
  const fromToken = useToken(fromTokenId ?? undefined)
  const toToken = useToken(toTokenId ?? undefined)
  const toNetworkId = getNetworkId(toToken)
  const toNetwork = useNetworkById(toNetworkId)
  const fromNetworkType = getNetworkType(fromToken)
  const toNetworkType = getNetworkType(toToken)

  // Track whether the user has explicitly picked an account via the account picker.
  // When true, auto-selection is suppressed to respect the user's choice.
  const fromAddressManuallySet = useRef(false)

  const substrateAccounts = useMemo(
    () => ownedAccounts.filter(isAccountAddressSs58),
    [ownedAccounts]
  )
  const ethAccounts = useMemo(() => ownedAccounts.filter(isAccountAddressEthereum), [ownedAccounts])
  const solanaAccounts = useMemo(
    () => ownedAccounts.filter(isAccountPlatformSolana),
    [ownedAccounts]
  )

  const fromAccount = useMemo(
    () =>
      fromAddress
        ? allAccounts.find((account) => isAddressEqual(account.address, fromAddress))
        : null,
    [allAccounts, fromAddress]
  )

  const fromEvmAccount = useMemo(
    () => ethAccounts.find((a) => a.address.toLowerCase() === fromAddress?.toLowerCase()),
    [ethAccounts, fromAddress]
  )
  const fromSubstrateAccount = useMemo(
    () => substrateAccounts.find((a) => a.address.toLowerCase() === fromAddress?.toLowerCase()),
    [fromAddress, substrateAccounts]
  )
  const fromSolanaAccount = useMemo(
    () => solanaAccounts.find((a) => a.address === fromAddress),
    [solanaAccounts, fromAddress]
  )

  // ─── Auto-select from address based on largest token balance ────
  useEffect(() => {
    if (!fromTokenId || !fromNetworkType || fromAddressManuallySet.current) return

    const compatibleAccounts = (() => {
      switch (fromNetworkType) {
        case "evm":
          return ethAccounts
        case "substrate":
          return substrateAccounts
        case "solana":
          return solanaAccounts
        default:
          return []
      }
    })()

    if (compatibleAccounts.length === 0) {
      setFromAddress(null)
      return
    }

    const accountsWithBalance = compatibleAccounts.map((a) => ({
      address: a.address,
      transferable:
        balances.find({ address: a.address, tokenId: fromTokenId }).each[0]?.transferable?.planck ??
        0n,
    }))

    accountsWithBalance.sort((a, b) => {
      if (a.transferable > b.transferable) return -1
      if (a.transferable < b.transferable) return 1
      return 0
    })

    const best = accountsWithBalance[0]
    setFromAddress(best?.address ?? null)
  }, [
    fromTokenId,
    fromNetworkType,
    ethAccounts,
    substrateAccounts,
    solanaAccounts,
    balances,
    setFromAddress,
  ])

  // ─── Auto-set to address when toTokenId changes ────────────────────
  useEffect(() => {
    if (!toTokenId || !toNetworkType) return

    switch (toNetworkType) {
      case "evm": {
        if (toAddress && (!toNetwork || isAddressCompatibleWithNetwork(toNetwork, toAddress)))
          return

        if (!isAccountPlatformEthereum(fromAccount)) return setToAddress(null)
        return setToAddress(fromAddress)
      }
      case "substrate": {
        if (toAddress && (!toNetwork || isAddressCompatibleWithNetwork(toNetwork, toAddress)))
          return

        if (
          !isAccountPlatformPolkadot(fromAccount) ||
          (toNetwork && !isAccountCompatibleWithNetwork(toNetwork, fromAccount))
        )
          return setToAddress(null)

        return setToAddress(fromAddress)
      }
      case "solana": {
        if (toAddress && (!toNetwork || isAddressCompatibleWithNetwork(toNetwork, toAddress)))
          return

        if (!isAccountPlatformSolana(fromAccount)) return setToAddress(null)
        return setToAddress(fromAddress)
      }
      default: {
        // biome-ignore lint/suspicious/noConsole: legacy
        console.error(
          `networkType ${toNetworkType} not handled in updateSelectedAccountsOnAssetChange`
        )
        return setToAddress(null)
      }
    }
  }, [fromAccount, fromAddress, setToAddress, toTokenId, toNetworkType, toAddress, toNetwork])

  // ─── Callbacks for FromToAccountSelector ──────────────────────────

  const setFromAddressWithReset = useCallback(
    (address: string | null) => {
      if (address !== null) fromAddressManuallySet.current = true
      setFromAddress(address)
      setToAddress(null)
    },
    [setFromAddress, setToAddress]
  )

  const resetFromAddressManuallySet = useCallback(() => {
    fromAddressManuallySet.current = false
  }, [])

  return {
    fromAddress,
    toAddress,
    setFromAddress: setFromAddressWithReset,
    setToAddress,
    ethAccounts,
    substrateAccounts,
    solanaAccounts,
    fromEvmAccount,
    fromSubstrateAccount,
    fromSolanaAccount,
    fromAccount,
    resetFromAddressManuallySet,
  }
}
