import { useEffect, useMemo, useState } from "react"

import { AccountJson, Balance, Balances } from "@extension/core"

export default function useEmptyBalancesFilter(
  balances: Balances,
  account: AccountJson | null,
): Balances {
  const balanceFilter = useMemo(
    () =>
      account?.type === "ethereum"
        ? moonbeamFilter
        : polkadotFilter(account?.isHardware ? account?.genesisHash : null),
    [account?.type, account?.genesisHash, account?.isHardware],
  )

  const [filteredBalances, setFilteredBalances] = useState<Balances>(new Balances([]))

  useEffect(() => {
    setFilteredBalances(balances.find(balanceFilter))
  }, [balances, balanceFilter])

  return filteredBalances
}

const moonbeamFilter = (balance: Balance) =>
  (balance.isSource("substrate-native") &&
    ["moonbeam", "moonriver"].includes(balance.chainId || "")) ||
  balance.transferable.planck !== 0n

const polkadotFilter = (genesisHash?: string | null) => (balance: Balance) => {
  let showBalance = balance.transferable.planck !== 0n

  if (balance.isSource("substrate-native")) {
    showBalance =
      (genesisHash
        ? balance.chain?.genesisHash === genesisHash
        : ["polkadot", "kusama"].includes(balance.chainId || "")) || showBalance
  }

  return showBalance
}
