import { Balance, Balances } from "@talismn/balances"
import { Token, TokenId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { Address, RemoteConfigStoreData } from "extension-core"
import { TALISMAN_WEB_APP_URL } from "extension-shared"
import { MouseEventHandler, useCallback, useMemo } from "react"

import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccounts, useFeatureFlag, useRemoteConfig, useTokensMap } from "@ui/state"

import { useBittensorBondModal } from "../../Bittensor/hooks/useBittensorBondModal"
import { type StakeType } from "../../Bittensor/hooks/useBittensorBondWizard"
import { BITTENSOR_TOKEN_ID } from "../../Bittensor/utils/constants"
import { useBondModal } from "./useBondModal"

export const useBondButton = ({
  balances,
  stakeType,
  netuid,
}: {
  balances: Balances | null | undefined
  stakeType?: StakeType
  netuid?: number
}) => {
  const { genericEvent } = useAnalytics()
  const tokensMap = useTokensMap()
  const ownedAccounts = useAccounts("owned")

  const remoteConfig = useRemoteConfig()
  const { open } = useBondModal()
  const { open: handleOpenBittensorModal } = useBittensorBondModal()
  const isSeekTaoDiscountEnabled = useFeatureFlag("SEEK_TAO_DISCOUNT")

  const ownedAddresses = useMemo(() => ownedAccounts.map(({ address }) => address), [ownedAccounts])

  const [bestBondableBalance, isBonding] = useMemo<[BondableBalance | null, boolean]>(() => {
    if (!balances?.each) return [null, false]

    const bondableBalances = balances.each
      .filter((b) => ownedAddresses.includes(b.address))
      .map((b) => getBondableBalance(b, tokensMap, remoteConfig, stakeType, netuid))
      .filter(isNotNil)
      .sort((a, b) => (a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1))

    return [
      bondableBalances.length ? bondableBalances[0] : null,
      bondableBalances.some((b) => b.isBonding),
    ]
  }, [balances, ownedAddresses, tokensMap, remoteConfig, stakeType, netuid])

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
          const { address, tokenId, hotkey, netuid } = bestBondableBalance
          handleOpenBittensorModal({
            address,
            tokenId,
            hotkey,
            netuid,
            stakeType,
            isSeekDiscountDrawerOpen: isSeekTaoDiscountEnabled,
            isSelectStakeDrawerOpen: !stakeType && !isSeekTaoDiscountEnabled,
            step: stakeType !== "subnet" ? "form" : "subnet-form",
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
      stakeType,
      isSeekTaoDiscountEnabled,
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
  tokensMap: Record<string, Token>,
  remoteConfig: RemoteConfigStoreData,
  stakeType: StakeType | undefined,
  netuid: number | undefined,
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
  // TODO rework the check so its not hardcoded to bittensor only.
  // this prevent testnets or local devnets from working with bittensor staking
  if (token?.id === BITTENSOR_TOKEN_ID) {
    const defaultHotkey = remoteConfig.stakingPools["bittensor"]?.[0] as string | undefined

    // we would need access to substrate-dtao balances to determine if user is already staking TAO elsewhere

    // // if user is already staking, reuse parameters
    // type SubtensorMeta = { hotkey?: string; netuid?: number } | undefined
    // const entry = balance.subtensor.find(
    //   (b) => !!(b.meta as SubtensorMeta)?.hotkey && (b.meta as SubtensorMeta)?.netuid === netuid,
    // )
    // const meta = entry?.meta as SubtensorMeta

    // on bittensor asset details the first button is staketype agnostic
    // we need to know if we're staking TAO anywhere to display the appropriate icon
    // const isBondingAny =
    //   !stakeType && balance.subtensor.some((b) => !!(b.meta as SubtensorMeta)?.hotkey)

    return {
      type: "bittensor",
      tokenId: token.id,
      address: balance.address,
      hotkey: defaultHotkey,
      netuid,
      amount: balance.transferable.planck,
      isBonding: false, // TODO
      // isBonding: !!meta || isBondingAny,
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
