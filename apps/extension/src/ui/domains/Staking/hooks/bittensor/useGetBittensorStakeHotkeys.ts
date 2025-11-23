import { DotNetworkId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { useMemo } from "react"

import { useBalances } from "@ui/state"

type UseBittensorDefaultHotkey = {
  networkId: DotNetworkId | null | undefined
  address: string | null | undefined
  netuid: number | null | undefined
}

/**
 * result hotkey is used to preselect validator if user is already staking TAO
 * @param param0
 * @returns
 */
export const useBittensorCurrentHotkey = ({
  networkId,
  address,
  netuid,
}: UseBittensorDefaultHotkey) => {
  const balances = useBalances()

  return useMemo(() => {
    if (!networkId) return undefined

    const dtaoBalances = balances
      .find({ networkId })
      .each.map((bal) => {
        const token = bal.token
        if (token?.type !== "substrate-dtao") return null
        if (!bal.free.planck) return null
        return {
          address: bal.address,
          netuid: token.netuid,
          hotkey: token.hotkey,
          free: bal.free.planck,
        }
      })
      .filter(isNotNil)
      .sort((a, b) => (b.free > a.free ? 1 : -1))

    if (address && typeof netuid === "number") {
      const fullMatch = dtaoBalances.find((bal) => bal.address === address && bal.netuid === netuid)
      if (fullMatch) return fullMatch.hotkey
    }

    if (!address) {
      const netuidMatch = dtaoBalances.find((bal) => bal.netuid === netuid)
      if (netuidMatch) return netuidMatch.hotkey
    }

    return undefined
  }, [balances, networkId, address, netuid])
}
