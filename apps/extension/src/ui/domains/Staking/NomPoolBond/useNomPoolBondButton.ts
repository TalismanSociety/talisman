import { TokenId } from "@talismn/chaindata-provider"
import { Balances } from "extension-core"
import { log } from "extension-shared"
import { MouseEventHandler, useCallback, useMemo } from "react"

import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccounts, useRemoteConfig, useToken } from "@ui/state"

import { useNomPoolBondModal } from "./useNomPoolBondModal"

export const useNomPoolBondButton = ({
  tokenId,
  balances,
}: {
  tokenId: TokenId | null | undefined
  balances: Balances | null | undefined
}) => {
  const { genericEvent } = useAnalytics()

  const ownedAccounts = useAccounts("owned")
  const token = useToken(tokenId)
  const remoteConfig = useRemoteConfig()
  const { open } = useNomPoolBondModal()

  const [openArgs, isNomPoolStaking] = useMemo<[Parameters<typeof open>[0] | null, boolean]>(() => {
    if (!balances || !tokenId || !token?.chain || token?.type !== "substrate-native")
      return [null, false]
    try {
      let isNomPoolStaking = false
      let poolId = remoteConfig.nominationPools[token.chain.id]?.[0]
      if (!poolId) return [null, false]

      const ownedAddresses = ownedAccounts.map(({ address }) => address)

      const sorted = balances
        .find({ tokenId })
        .each.filter((b) => ownedAddresses.includes(b.address))
        .sort((a, b) => {
          if (a.transferable.planck === b.transferable.planck) return 0
          return a.transferable.planck > b.transferable.planck ? -1 : 1
        })

      // if a watch-only account is selected, there will be no entries here
      if (!sorted.length) return [null, false]

      const address = sorted[0].address

      // lookup existing poolId for that account
      for (const balance of sorted.filter((b) => b.address === address)) {
        type Meta = { poolId?: number }
        const pool = balance.nompools.find((np) => !!(np.meta as Meta).poolId)
        const meta = pool?.meta as Meta | undefined
        if (meta?.poolId) {
          poolId = meta.poolId
          isNomPoolStaking = true
          break
        }
      }

      return [{ tokenId, address, poolId }, isNomPoolStaking]
    } catch (err) {
      log.error("Failed to compute staking modal open args", err)
    }

    return [null, false]
  }, [balances, ownedAccounts, remoteConfig.nominationPools, tokenId, token?.chain, token?.type])

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      if (!openArgs) return

      e.stopPropagation()

      open(openArgs)
      genericEvent("open inline staking modal", { tokenId: openArgs.tokenId, from: "portfolio" })
    },
    [genericEvent, open, openArgs],
  )

  return { canBondNomPool: !!openArgs, onClick: openArgs ? handleClick : null, isNomPoolStaking }
}
