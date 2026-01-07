import { SubDTaoToken } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { useTokens } from "@ui/state"

import { BITTENSOR_NETWORK_ID } from "./constants"

export const useTaoDashboardSubnets = () => {
  const allTokens = useTokens()

  const subnetTokens = useMemo(() => {
    return allTokens.filter(
      (token): token is SubDTaoToken =>
        token.type === "substrate-dtao" &&
        !!token.netuid && // ignore root
        !token.hotkey && // ignore dynamic tokens
        token.networkId === BITTENSOR_NETWORK_ID, // ignore testnet
    )
  }, [allTokens])

  return useMemo(() => {
    return subnetTokens
      .map((t) => ({
        tokenId: t.id,
        netuid: t.netuid,
        name: t.subnetName,
        symbol: t.symbol,
        logo: t.logo,
      }))
      .sort((a, b) => a.netuid - b.netuid)
  }, [subnetTokens])
}

export type TaoDashboardSubnet = ReturnType<typeof useTaoDashboardSubnets>[number]
