import type { RemoteConfigStoreData } from "@core/domains/app/types"
import type { Balance, Balances } from "@talismn/balances"
import { type SubDTaoToken, subNativeTokenId, type TokenId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useBittensorNetworkIds } from "@ui/state/bittensor"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { type MouseEventHandler, useCallback, useMemo } from "react"

import { useBittensorBondModal } from "../Bittensor/hooks/useBittensorBondModal"
import { useNomPoolStakingStatus } from "../hooks/nomPools/useNomPoolStakingStatus"
import { useGetSeekStaked } from "../Seek/hooks/useGetSeekStaked"
import { useUnbondModal } from "./useUnbondModal"

export const useUnbondButton = ({ balances }: { balances: Balances | null | undefined }) => {
  const { genericEvent } = useAnalytics()
  const ownedAccounts = useAccounts("owned")

  const remoteConfig = useRemoteConfig()
  const { open: openBittensorModal } = useBittensorBondModal()
  const { open: openUnbondModal } = useUnbondModal()
  const bittensorNetworkIds = useBittensorNetworkIds()
  const allBalances = useBalances("owned")
  const seekStaked = useGetSeekStaked()

  const ownedAddresses = useMemo(() => ownedAccounts.map(({ address }) => address), [ownedAccounts])

  // Extract NomPool-eligible tokenId for staking status check.
  // Safe to pass empty string — useNomPoolStakingStatus returns null data for unknown tokens.
  const nomPoolTokenId = useMemo<TokenId>(() => {
    if (!balances?.each) return "" as TokenId
    const b = balances.each.find(
      (b) =>
        b.token?.type === "substrate-native" &&
        !!remoteConfig.nominationPools[b.token.networkId]?.length
    )
    return (b?.token?.id ?? "") as TokenId
  }, [balances, remoteConfig.nominationPools])

  const { data: nomPoolStakingStatus } = useNomPoolStakingStatus(nomPoolTokenId)

  const bestUnbondableBalance = useMemo(() => {
    if (!balances?.each) return null

    const unbondableBalances = balances.each
      .filter((b) => ownedAddresses.includes(b.address))
      .map((b) =>
        getUnbondableBalance(
          b,
          remoteConfig,
          bittensorNetworkIds,
          allBalances,
          seekStaked.data.balances,
          nomPoolStakingStatus?.accounts
        )
      )
      .filter(isNotNil)
      .sort((a, b) => (a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1))

    return unbondableBalances.length ? unbondableBalances[0] : null
  }, [
    allBalances,
    balances,
    bittensorNetworkIds,
    nomPoolStakingStatus?.accounts,
    ownedAddresses,
    remoteConfig,
    seekStaked.data.balances,
  ])

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      if (!bestUnbondableBalance) return
      e.stopPropagation()

      genericEvent("open inline unstaking modal", {
        tokenId: bestUnbondableBalance.tokenId,
        from: "portfolio",
      })

      switch (bestUnbondableBalance.type) {
        case "bittensor": {
          const { address, networkId, hotkey, netuid } = bestUnbondableBalance
          openBittensorModal({
            stakeDirection: "unbond",
            address,
            networkId,
            hotkey,
            netuid,
          })
          break
        }
        case "seek": {
          window.open(remoteConfig.seek.unstakingUrl, "_blank", "noopener")
          break
        }
        case "nominationPool": {
          const { address, tokenId, poolId } = bestUnbondableBalance
          openUnbondModal({ address, tokenId, poolId })
          break
        }
      }
    },
    [
      bestUnbondableBalance,
      genericEvent,
      openBittensorModal,
      remoteConfig.seek.unstakingUrl,
      openUnbondModal,
    ]
  )

  return {
    canUnbond: !!bestUnbondableBalance,
    onClick: bestUnbondableBalance ? handleClick : null,
  }
}

type UnbondableBalance =
  | {
      type: "seek"
      tokenId: TokenId
      address: string
      amount: bigint
    }
  | {
      type: "bittensor"
      networkId: string
      tokenId: TokenId
      address: string
      amount: bigint
      hotkey?: string
      netuid: number
    }
  | {
      type: "nominationPool"
      tokenId: TokenId
      address: string
      amount: bigint
      poolId: number
    }

const getUnbondableBalance = (
  balance: Balance,
  remoteConfig: RemoteConfigStoreData,
  bittensorNetworkIds: string[],
  allBalances: Balances,
  seekStakedBalances: Array<{ address: string; balance: { planck: bigint } }>,
  nomPoolStakingAccounts: Array<{ address: string; canUnstake: unknown }> | undefined
): UnbondableBalance | null => {
  const token = balance.token
  if (!token) return null

  /**
   * Seek Unstaking — enabled only if account has staked balance
   */
  if (token.id === remoteConfig.seek.tokenId) {
    const accountStaked = seekStakedBalances.find(
      (s) => s.address === balance.address && s.balance.planck > 0n
    )
    if (!accountStaked) return null
    return {
      type: "seek",
      tokenId: token.id,
      address: balance.address,
      amount: accountStaked.balance.planck,
    }
  }

  /**
   * Bittensor native TAO — unstake from root subnet (netuid 0)
   */
  if (token.type === "substrate-native" && bittensorNetworkIds.includes(token.networkId)) {
    // Scope to the same account to prevent showing unbond for a different account's position
    const rootBalance = allBalances.each.find(
      (b) =>
        b.address === balance.address &&
        b.networkId === token.networkId &&
        b.token?.type === "substrate-dtao" &&
        (b.token as SubDTaoToken).netuid === 0 &&
        b.free.planck > 0n
    )
    if (!rootBalance) return null
    const rootToken = rootBalance.token as SubDTaoToken
    return {
      type: "bittensor",
      networkId: token.networkId,
      tokenId: subNativeTokenId(token.networkId),
      address: rootBalance.address,
      netuid: 0,
      hotkey: rootToken.hotkey,
      amount: rootBalance.free.planck,
    }
  }

  /**
   * Bittensor dTAO — unstake from specific subnet
   */
  if (token.type === "substrate-dtao" && bittensorNetworkIds.includes(token.networkId)) {
    if (balance.free.planck <= 0n) return null
    return {
      type: "bittensor",
      networkId: token.networkId,
      tokenId: subNativeTokenId(token.networkId),
      address: balance.address,
      hotkey: (token as SubDTaoToken).hotkey,
      netuid: (token as SubDTaoToken).netuid,
      amount: balance.free.planck,
    }
  }

  /**
   * Nomination Pool Unstaking
   */
  if (
    token.type === "substrate-native" &&
    !!remoteConfig.nominationPools[token.networkId]?.length
  ) {
    const accountStatus = nomPoolStakingAccounts?.find(
      (s) => s.address === balance.address && s.canUnstake
    )
    if (!accountStatus) return null

    type NomPoolMeta = { poolId?: number } | undefined
    const entry = balance.nompools.find((b) => !!(b.meta as NomPoolMeta)?.poolId)
    const meta = entry?.meta as NomPoolMeta
    if (!meta?.poolId) return null

    // canUnstake holds the staked points (bigint) — use it for sorting
    const stakedAmount =
      typeof accountStatus.canUnstake === "bigint" ? accountStatus.canUnstake : 0n

    return {
      type: "nominationPool",
      tokenId: token.id,
      address: balance.address,
      poolId: meta.poolId,
      amount: stakedAmount,
    }
  }

  return null
}
