import type { TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { useAccountsMap } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useBittensorNetworkIds, useBittensorValidatorsMap } from "@ui/state/bittensor"
import { useMemo } from "react"

import { type BittensorStakePosition, toBittensorStakePositions } from "./bittensorStakePosition"

export const useBittensorStakePositions = (): BittensorStakePosition[] => {
  const balances = useBalances("portfolio")
  const accountsByAddress = useAccountsMap()
  const { data: validatorsByHotkey } = useBittensorValidatorsMap()
  const bittensorNetworkIds = useBittensorNetworkIds()

  return useMemo(
    () =>
      toBittensorStakePositions(balances, {
        bittensorNetworkIds,
        accountsByAddress,
        validatorsByHotkey,
      }),
    [balances, bittensorNetworkIds, accountsByAddress, validatorsByHotkey]
  )
}

export const useBittensorStakePosition = (tokenId: TokenId, address: string) => {
  const positions = useBittensorStakePositions()

  return useMemo(
    () =>
      positions.find(
        (position) => position.tokenId === tokenId && isAddressEqual(position.address, address)
      ) ?? null,
    [positions, tokenId, address]
  )
}
