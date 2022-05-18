import { Balances, Balance } from "@core/types"
import { useMemo } from "react"
import { AccountJson } from "@core/types"

export default function useEmptyBalancesFilter(
  balances: Balances,
  account: AccountJson | null
): Balances {
  const balanceFilter = useMemo(
    () =>
      account?.type === "ethereum"
        ? moonbeamFilter
        : polkadotFilter(account?.isHardware ? account?.genesisHash : null),
    [account?.type, account?.genesisHash, account?.isHardware]
  )

  return useMemo(() => balances.find(balanceFilter), [balances, balanceFilter])
}

const moonbeamFilter = (balance: Balance) =>
  (balance.isPallet("balances") && ["moonbeam", "moonriver"].includes(balance.chainId)) ||
  balance.transferable.planck !== BigInt("0")

const polkadotFilter = (genesisHash?: string | null) => (balance: Balance) => {
  let showBalance = balance.transferable.planck !== BigInt("0")

  if (balance.isPallet("balances")) {
    showBalance =
      (genesisHash
        ? balance.chain?.genesisHash === genesisHash
        : ["polkadot", "kusama"].includes(balance.chainId)) || showBalance
  }

  return showBalance
}
