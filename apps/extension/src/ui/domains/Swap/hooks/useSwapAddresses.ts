import {
  isAccountCompatibleWithNetwork,
  isAddressCompatibleWithNetwork,
} from "@core/domains/accounts/helpers"
import {
  isAccountAddressEthereum,
  isAccountAddressSs58,
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
} from "@core/domains/keyring/exports"
import { isAddressEqual } from "@talismn/crypto"
import { useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useNetworkById } from "@ui/state/chaindata"
import { useCallback, useEffect, useMemo, useRef } from "react"

import type { SwappableAssetWithDecimals } from "../swap-modules/common.swap-module"

/**
 * Unified address management for swaps.
 *
 * Replaces the old 5 separate address states (fromEvmAddress, fromSubstrateAddress,
 * toEvmAddress, toSubstrateAddress, toBtcAddress) with a simple {from, to} pair.
 * Platform-specific logic is derived from asset.networkType at consumption time.
 */
export function useSwapAddresses({
  fromAddress,
  setFromAddress,
  toAddress,
  setToAddress,
  fromAsset,
  toAsset,
}: {
  fromAddress: string | null
  setFromAddress: (v: string | null) => void
  toAddress: string | null
  setToAddress: (v: string | null) => void
  fromAsset: SwappableAssetWithDecimals | null
  toAsset: SwappableAssetWithDecimals | null
}) {
  // TODO: Support signet accounts
  const allAccounts = useAccounts()
  const ownedAccounts = useAccounts("owned")
  const balances = useBalances()
  const toNetwork = useNetworkById(String(toAsset?.chainId ?? ""))

  // Track whether the user has explicitly picked an account via the account picker.
  // When true, auto-selection is suppressed to respect the user's choice.
  const fromAddressManuallySet = useRef(false)

  const substrateAccounts = useMemo(
    () => ownedAccounts.filter(isAccountAddressSs58),
    [ownedAccounts]
  )
  const ethAccounts = useMemo(() => ownedAccounts.filter(isAccountAddressEthereum), [ownedAccounts])

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

  // ─── Auto-select from address based on largest token balance ────
  // When fromAsset changes and the user hasn't manually picked an account,
  // select the owned account with the largest balance for the selected token.
  useEffect(() => {
    if (!fromAsset || fromAddressManuallySet.current) return

    const compatibleAccounts = (() => {
      switch (fromAsset.networkType) {
        case "evm":
          return ethAccounts
        case "substrate":
          return substrateAccounts
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
        balances.find({ address: a.address, tokenId: fromAsset.id }).each[0]?.transferable
          ?.planck ?? 0n,
    }))

    accountsWithBalance.sort((a, b) => {
      if (a.transferable > b.transferable) return -1
      if (a.transferable < b.transferable) return 1
      return 0
    })

    const best = accountsWithBalance[0]
    setFromAddress(best?.address ?? null)
  }, [fromAsset, ethAccounts, substrateAccounts, balances, setFromAddress])

  // ─── Auto-set to address when toAsset changes ────────────────────
  useEffect(() => {
    if (!toAsset) return

    switch (toAsset.networkType) {
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
      case "btc": {
        if (toAddress) return
        return setToAddress(null)
      }
      default: {
        // biome-ignore lint/suspicious/noConsole: legacy
        console.error(
          `networkType ${toAsset.networkType} not handled in updateSelectedAccountsOnAssetChange`
        )
        return setToAddress(null)
      }
    }
  }, [fromAccount, fromAddress, setToAddress, toAsset, toAddress, toNetwork])

  // ─── Callbacks for FromToAccountSelector ──────────────────────────

  const setFromAddressWithReset = useCallback(
    (address: string | null) => {
      // Mark as manually set only when the user explicitly picks an account (non-null).
      // Null is dispatched by the SeparatedAccountSelector clear-effect and should not count.
      if (address !== null) fromAddressManuallySet.current = true
      setFromAddress(address)
      // Reset to-address so useSetToAddress auto-derives it
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
    fromEvmAccount,
    fromSubstrateAccount,
    fromAccount,
    resetFromAddressManuallySet,
  }
}
