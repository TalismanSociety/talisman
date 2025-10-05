import { Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { log, TALISMAN_WEB_APP_URL } from "extension-shared"
import { MouseEventHandler, useCallback, useMemo } from "react"

import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccounts, useRemoteConfig, useToken } from "@ui/state"

import { useBittensorBondModal } from "../../Bittensor/hooks/useBittensorBondModal"
import { type StakeType } from "../../Bittensor/hooks/useBittensorBondWizard"
import { useBondModal } from "./useBondModal"

export const useBondButton = ({
  tokenId,
  balances,
  stakeType = "root",
  netuid,
}: {
  tokenId: TokenId | null | undefined
  balances: Balances | null | undefined
  stakeType?: StakeType
  netuid?: number
}) => {
  const { genericEvent } = useAnalytics()

  const ownedAccounts = useAccounts("owned")
  const token = useToken(tokenId)
  const remoteConfig = useRemoteConfig()
  const { open } = useBondModal()
  const { open: handleOpenBittensorModal } = useBittensorBondModal()

  // const seekStakingPath = remoteConfig.seek.webAppStakingPath // TODO: Uncomment this once remote config is updated
  const seekStakingPath = useMemo(() => "/staking/providers?action=stake&type=seek", [])

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
    // const isStakingEnableForToken = Boolean(
    //   token?.networkId &&
    //     token?.symbol &&
    //     remoteConfig.stakingPools[token.networkId]?.includes(token.symbol),
    // ) //  TODO: Uncomment this once remote config is updated

    const isStakingEnableForToken = token?.symbol === "SEEK" //  TODO: Remove this once remote config is updated

    if (
      !token ||
      !tokenId ||
      !balances ||
      (token?.type !== "substrate-native" && !isStakingEnableForToken)
    )
      return [null, false]
    try {
      const poolId =
        remoteConfig.stakingPools[token.networkId]?.[0] ||
        remoteConfig.nominationPools[token.networkId]?.[0] ||
        "SeekPoolId"

      const isStakingEnabled = !!remoteConfig.stakingPools[token.networkId]

      if (!poolId && !isStakingEnabled && !isStakingEnableForToken) return [null, false]

      // if a watch-only or solo-staking account is selected, array will be empty
      // if (!sorted.length) return [null, false] // TODO: Uncomment this when you have an account that has seek. MUST UNCOMMENT THIS before shipping to prod.

      // lookup existing poolId for that account
      for (const balance of sorted.filter((b) => b.address === address)) {
        switch (token.networkId) {
          case "bittensor": {
            type SubtensorMeta = { hotkey?: string; netuid?: number } | undefined
            const entry = balance.subtensor.find(
              (b) =>
                !!(b.meta as SubtensorMeta)?.hotkey && (b.meta as SubtensorMeta)?.netuid === netuid,
            )

            const meta = entry?.meta as SubtensorMeta
            if (meta?.hotkey) {
              return [{ tokenId, address, poolId: meta?.hotkey, netuid }, true]
            }
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
  }, [
    balances,
    tokenId,
    token,
    remoteConfig.stakingPools,
    remoteConfig.nominationPools,
    sorted,
    address,
    netuid,
  ])

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      if (!openArgs) return
      e.stopPropagation()

      if (token?.networkId === "bittensor") {
        handleOpenBittensorModal({
          ...openArgs,
          stakeType,
          isSelectStakeDrawerOpen: stakeType === "root",
          step: stakeType === "root" ? "form" : "subnet-form",
          netuid,
        })
      } else if (token?.symbol === "SEEK") {
        window.open(`${TALISMAN_WEB_APP_URL}${seekStakingPath}`, "_blank", "noopener")
      } else {
        open(openArgs)
      }
      genericEvent("open inline staking modal", { tokenId: openArgs.tokenId, from: "portfolio" })
    },
    [
      openArgs,
      token?.networkId,
      token?.symbol,
      genericEvent,
      handleOpenBittensorModal,
      stakeType,
      netuid,
      seekStakingPath,
      open,
    ],
  )

  return { canBondNomPool: !!openArgs, onClick: openArgs ? handleClick : null, isNomPoolStaking }
}
