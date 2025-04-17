import { TokenId } from "@talismn/chaindata-provider"
import { Balances } from "extension-core"
import { log } from "extension-shared"
import { MouseEventHandler, useCallback, useMemo } from "react"

import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccounts, useRemoteConfig, useToken } from "@ui/state"

import { useBondModal } from "./useBondModal"

export const useBondButton = ({
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
  const { open } = useBondModal()

  const ownedAddresses = useMemo(() => ownedAccounts.map(({ address }) => address), [ownedAccounts])

  // accounts that are solo-staking cannot stake in nomination pools
  const soloStakingAddresses = useMemo(() => {
    type SoloStakingMeta = { id?: string } | undefined
    return (
      balances?.each
        .filter((b) => b.locks.some((l) => (l.meta as SoloStakingMeta)?.id === "staking ")) // yes, there is a space at the end :jean:
        .map((b) => b.address) ?? []
    )
  }, [balances])

  const sorted = useMemo(() => {
    if (!balances || !tokenId) return []
    return balances
      .find({ tokenId })
      .each.filter(
        (b) => ownedAddresses.includes(b.address) && !soloStakingAddresses.includes(b.address),
      )
      .sort((a, b) => {
        if (a.transferable.planck === b.transferable.planck) return 0
        return a.transferable.planck > b.transferable.planck ? -1 : 1
      })
  }, [balances, ownedAddresses, soloStakingAddresses, tokenId])

  const address = sorted[0]?.address

  const [openArgs, isNomPoolStaking] = useMemo<[Parameters<typeof open>[0] | null, boolean]>(() => {
    if (!balances || !tokenId || !token?.chain || token?.type !== "substrate-native")
      return [null, false]
    try {
      const poolId =
        remoteConfig.stakingPools[token.chain.id]?.[0] ||
        remoteConfig.nominationPools[token.chain.id]?.[0]

      const isStakingEnabled = !!remoteConfig.stakingPools[token.chain.id]

      if (!poolId && !isStakingEnabled) return [null, false]

      // if a watch-only or solo-staking account is selected, array will be empty
      if (!sorted.length) return [null, false]

      // lookup existing poolId for that account
      for (const balance of sorted.filter((b) => b.address === address)) {
        switch (token.chain.id) {
          case "bittensor": {
            type SubtensorMeta = { hotkeys?: string[] } | undefined
            const entry = balance.subtensor.find(
              (b) => !!(b.meta as SubtensorMeta)?.hotkeys?.length,
            )
            const meta = entry?.meta as SubtensorMeta
            if (meta?.hotkeys?.[0]) return [{ tokenId, address, poolId: meta?.hotkeys[0] }, false]
            break
          }
          default: {
            // assume nomination pool staking, but there will be more in the future
            type NomPoolMeta = { poolId?: number } | undefined
            const entry = balance.nompools.find((b) => !!(b.meta as NomPoolMeta)?.poolId)
            const meta = entry?.meta as NomPoolMeta
            if (meta?.poolId) return [{ tokenId, address, poolId: meta.poolId }, true]
            break
          }
        }
      }

      return [{ tokenId, address, poolId }, false]
    } catch (err) {
      log.error("Failed to compute staking modal open args", err)
    }

    return [null, false]
  }, [balances, remoteConfig, tokenId, token?.chain, token?.type, address, sorted])

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
