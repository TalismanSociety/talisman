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
import { useNetworkById } from "@ui/state/chaindata"
import { useCallback, useEffect, useMemo } from "react"

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
  toAsset,
}: {
  fromAddress: string | null
  setFromAddress: (v: string | null) => void
  toAddress: string | null
  setToAddress: (v: string | null) => void
  toAsset: SwappableAssetWithDecimals | null
}) {
  // TODO: Support signet accounts
  const allAccounts = useAccounts()
  const ownedAccounts = useAccounts("owned")
  const toNetwork = useNetworkById(String(toAsset?.chainId ?? ""))

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

  // ─── Auto-initialize from address ────────────────────────────────
  // Pick the first EVM or Substrate account if none is set
  useEffect(() => {
    if (fromAddress) return
    const firstEth = ethAccounts[0]?.address as `0x${string}` | undefined
    const firstSub = substrateAccounts[0]?.address
    if (firstEth) setFromAddress(firstEth)
    else if (firstSub) setFromAddress(firstSub)
  }, [ethAccounts, substrateAccounts, fromAddress, setFromAddress])

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
      setFromAddress(address)
      // Reset to-address so useSetToAddress auto-derives it
      setToAddress(null)
    },
    [setFromAddress, setToAddress]
  )

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
  }
}
