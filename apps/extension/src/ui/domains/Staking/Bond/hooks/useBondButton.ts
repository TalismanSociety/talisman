import { Balance, Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { Address, RemoteConfigStoreData } from "extension-core"
import { TALISMAN_WEB_APP_URL } from "extension-shared"
import { MouseEventHandler, useCallback, useMemo } from "react"

import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccounts, useBalances, useRemoteConfig } from "@ui/state"
import { useBittensorNetworkIds } from "@ui/state/bittensor"

import { useBittensorBondModal } from "../../Bittensor/hooks/useBittensorBondModal"
import { useBondModal } from "./useBondModal"

export const useBondButton = ({ balances }: { balances: Balances | null | undefined }) => {
  const { genericEvent } = useAnalytics()
  const ownedAccounts = useAccounts("owned")

  const remoteConfig = useRemoteConfig()
  const { open } = useBondModal()
  const { open: handleOpenBittensorModal } = useBittensorBondModal()
  const bittensorNetworkIds = useBittensorNetworkIds()
  const allBalances = useBalances("owned")

  const ownedAddresses = useMemo(() => ownedAccounts.map(({ address }) => address), [ownedAccounts])

  const [bestBondableBalance, isBonding] = useMemo<[BondableBalance | null, boolean]>(() => {
    if (!balances?.each) return [null, false]

    const bondableBalances = balances.each
      .filter((b) => ownedAddresses.includes(b.address))
      .map((b) => getBondableBalance(b, remoteConfig, bittensorNetworkIds, allBalances))
      .filter(isNotNil)
      .sort((a, b) => (a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1))

    return [
      bondableBalances.length ? bondableBalances[0] : null,
      bondableBalances.some((b) => b.isBonding),
    ]
  }, [allBalances, balances, bittensorNetworkIds, ownedAddresses, remoteConfig])

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      if (!bestBondableBalance) return
      e.stopPropagation()

      genericEvent("open inline staking modal", {
        tokenId: bestBondableBalance.tokenId,
        from: "portfolio",
      })

      switch (bestBondableBalance.type) {
        case "bittensor": {
          const { address, tokenId } = bestBondableBalance
          handleOpenBittensorModal({
            address,
            tokenId,
          })
          break
        }
        case "seek": {
          const seekStakingPath = remoteConfig.seek.webAppStakingPath
          window.open(`${TALISMAN_WEB_APP_URL}${seekStakingPath}`, "_blank", "noopener")
          break
        }
        case "nominationPool": {
          const { address, tokenId, poolId } = bestBondableBalance
          open({ address, tokenId, poolId })
          break
        }
      }
    },
    [
      bestBondableBalance,
      genericEvent,
      handleOpenBittensorModal,
      remoteConfig.seek.webAppStakingPath,
      open,
    ],
  )

  return {
    canBond: !!bestBondableBalance,
    onClick: bestBondableBalance ? handleClick : null,
    isBonding,
  }
}

type BondableBalance =
  | {
      type: "seek"
      tokenId: TokenId
      address: Address
      amount: bigint
      isBonding: boolean
    }
  | {
      type: "bittensor"
      tokenId: TokenId
      address: Address
      amount: bigint
      hotkey?: string
      netuid?: number
      isBonding: boolean
    }
  | {
      type: "nominationPool"
      tokenId: TokenId
      address: Address
      amount: bigint
      poolId: number
      isBonding: boolean
    }

const getBondableBalance = (
  balance: Balance,
  remoteConfig: RemoteConfigStoreData,
  bittensorNetworkIds: string[],
  allBalances: Balances,
): BondableBalance | null => {
  const token = balance.token
  if (!token) return null

  /**
   * Seek Staking
   */
  if (token.id === remoteConfig.seek.tokenId) {
    return {
      type: "seek",
      tokenId: token.id,
      address: balance.address,
      amount: balance.transferable.planck,
      isBonding: false, // TODO add meta to balance if already staking
    }
  }

  /**
   * Bittensor Staking
   */
  if (
    // token.id === BITTENSOR_TOKEN_ID && // remove this check once staking works on devnets / localnets (for now our validators/subnet pickers assume mainnet only)
    token?.type === "substrate-native" &&
    bittensorNetworkIds.includes(token.networkId)
  ) {
    const defaultHotkey = remoteConfig.stakingPools["bittensor"]?.[0] as string | undefined

    const isBonding = allBalances.each.some(
      (b) =>
        b.networkId === token.networkId &&
        b.token?.type === "substrate-dtao" &&
        b.address === balance.address &&
        b.free.planck > 0n,
    )

    return {
      type: "bittensor",
      tokenId: token.id,
      address: balance.address,
      hotkey: defaultHotkey,
      amount: balance.transferable.planck,
      isBonding,
    }
  }

  /**
   * Nomination Pool Staking
   */
  if (
    token?.type === "substrate-native" &&
    !!remoteConfig.nominationPools[token.networkId]?.length
  ) {
    const defaultPoolId = remoteConfig.nominationPools[token.networkId][0]

    // cant stake in nom pools if solo staking
    type SoloStakingMeta = { id?: string } | undefined
    if (balance.locks.some((l) => (l.meta as SoloStakingMeta)?.id === "staking "))
      // the space is intentional
      return null

    // if already staking in a pool, reuse that poolId
    type NomPoolMeta = { poolId?: number } | undefined
    const entry = balance.nompools.find((b) => !!(b.meta as NomPoolMeta)?.poolId)
    const meta = entry?.meta as NomPoolMeta

    return {
      type: "nominationPool",
      tokenId: token.id,
      address: balance.address,
      poolId: meta?.poolId ?? defaultPoolId,
      amount: balance.transferable.planck,
      isBonding: !!meta,
    }
  }

  return null
}
