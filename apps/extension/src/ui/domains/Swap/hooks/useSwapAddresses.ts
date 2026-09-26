import {
  isAccountCompatibleWithNetwork,
  isAddressCompatibleWithNetwork,
} from "@core/domains/accounts/helpers"
import {
  type Account,
  isAccountAddressEthereum,
  isAccountAddressSs58,
  isAccountPlatformBitcoin,
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
  isAccountPlatformSolana,
} from "@core/domains/keyring/exports"
import { deriveBitcoinAddressFromXpub, isAddressEqual, isBitcoinXpub } from "@talismn/crypto"
import { useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useCallback, useEffect, useMemo, useRef } from "react"

/**
 * Unified address management for swaps.
 *
 * Replaces the old 5 separate address states with a simple {from, to} pair.
 * Platform-specific logic is derived from the Talisman Token type at consumption time.
 */
// resolves a payable bitcoin receive address from an owned bitcoin account
const getBitcoinPayoutAddress = (account: Account, networkId?: string): string | null => {
  const hrp = networkId === "bitcoin-signet" ? "tb" : "bc"
  if (account.type === "hd-bitcoin" || account.type === "ledger-bitcoin")
    return deriveBitcoinAddressFromXpub(account.keys.payments.xpub, "p2wpkh", 0, 0, hrp)
  if (account.type === "watch-only-bitcoin")
    return deriveBitcoinAddressFromXpub(account.address, account.addressType, 0, 0, hrp)
  // WIF keypair account: address is already a plain bc1q
  return isBitcoinXpub(account.address) ? null : account.address
}

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
  const fromNetwork = useNetworkById(fromToken?.networkId)
  const toNetwork = useNetworkById(toToken?.networkId)
  const fromPlatform = fromToken?.platform ?? null
  const toPlatform = toToken?.platform ?? null

  // Track whether the user has explicitly picked an account via the account picker.
  // When true, auto-selection is suppressed to respect the user's choice.
  const fromAddressManuallySet = useRef(false)

  // Platform-specific account lists are still needed for derived values (fromEvmAccount, etc.)
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
    if (!fromTokenId || !fromPlatform || !fromNetwork || fromAddressManuallySet.current) return

    const compatibleAccounts = ownedAccounts.filter((a) =>
      isAccountCompatibleWithNetwork(fromNetwork, a)
    )

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
  }, [fromTokenId, fromPlatform, fromNetwork, ownedAccounts, balances, setFromAddress])

  // ─── Clear from address if it becomes incompatible with the network ─
  // Handles manually-set addresses that the auto-select effect skips.
  useEffect(() => {
    if (!fromAddress || !fromNetwork) return
    // a bitcoin account's identity is an xpub, which isn't a decodable on-chain
    // address — check via the owned account when we have it, falling back to the
    // address-only check for pasted/external addresses
    const compatible = fromAccount
      ? isAccountCompatibleWithNetwork(fromNetwork, fromAccount)
      : isAddressCompatibleWithNetwork(fromNetwork, fromAddress)
    if (!compatible) {
      fromAddressManuallySet.current = false
      setFromAddress(null)
    }
  }, [fromAddress, fromNetwork, fromAccount, setFromAddress])

  // ─── Auto-set to address when toTokenId changes ────────────────────
  useEffect(() => {
    if (!toNetwork && toAddress) return setToAddress(null) // if we don't know the toNetwork, we can't verify compatibility, so we reset toAddress to be safe
    if (!toTokenId || !toPlatform) return

    // TODO: looks like this can be simplified by just checking if the currently set toAddress is compatible with the new token's network, and if not, try to set it to the fromAddress if that is compatible, and if not just set it to null.
    // Keeping this for now because no bug found, but it's smelly
    switch (toPlatform) {
      case "ethereum": {
        if (toAddress && (!toNetwork || isAddressCompatibleWithNetwork(toNetwork, toAddress)))
          return

        if (!isAccountPlatformEthereum(fromAccount)) return setToAddress(null)
        return setToAddress(fromAddress)
      }
      case "polkadot": {
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
      case "bitcoin": {
        // bitcoin account identities are xpubs, but the exchange needs a payable
        // address — resolve the account's first payments (bc1q) receive address
        if (
          toAddress &&
          !isBitcoinXpub(toAddress) &&
          (!toNetwork || isAddressCompatibleWithNetwork(toNetwork, toAddress))
        )
          return

        const btcAccount = ownedAccounts.find(isAccountPlatformBitcoin)
        const payoutAddress = btcAccount && getBitcoinPayoutAddress(btcAccount, toNetwork?.id)
        return setToAddress(payoutAddress ?? null)
      }
      default: {
        // biome-ignore lint/suspicious/noConsole: legacy
        console.error(`platform ${toPlatform} not handled in updateSelectedAccountsOnAssetChange`)
        return setToAddress(null)
      }
    }
  }, [
    fromAccount,
    fromAddress,
    setToAddress,
    toTokenId,
    toPlatform,
    toAddress,
    toNetwork,
    ownedAccounts,
  ])

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

  const setFromAddressManuallySetCb = useCallback((v: boolean) => {
    fromAddressManuallySet.current = v
  }, [])

  return {
    fromAddress,
    toAddress,
    setFromAddress: setFromAddressWithReset,
    setToAddress,
    fromEvmAccount,
    fromSubstrateAccount,
    fromSolanaAccount,
    fromAccount,
    resetFromAddressManuallySet,
    setFromAddressManuallySet: setFromAddressManuallySetCb,
  }
}
