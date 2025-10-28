import { DotNetworkId, SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { useMemo } from "react"

import { useAccounts, useBalances } from "@ui/state"
import { useBittensorValidatorsMap } from "@ui/state/bittensor"

export const useBittensorStakingPositions = (networkId: DotNetworkId | null | undefined) => {
  const balances = useBalances()
  const ownedAccounts = useAccounts("owned")
  const { data: validators } = useBittensorValidatorsMap()

  return useMemo(() => {
    if (!networkId) return []

    return balances.each
      .filter(
        (b) =>
          b.token?.type === "substrate-dtao" &&
          b.token.networkId === networkId &&
          b.free.planck > 0n,
      )
      .map((balance) => {
        const token = balance.token as SubDTaoToken
        return {
          id: balance.id,
          // marking account non null here for the output typing, the check is done in the following filter()
          account: ownedAccounts.find((a) => isAddressEqual(a.address, balance.address))!,
          token,
          balance,
          validatorName: token.hotkey ? validators[token.hotkey]?.name : undefined,
        }
      })
      .filter((p) => !!p.account)
      .sort((a, b) => (a.balance.free.planck > b.balance.free.planck ? -1 : 1))
  }, [balances.each, networkId, ownedAccounts, validators])
}

export type BittensorStakingPosition = ReturnType<typeof useBittensorStakingPositions>[number]
