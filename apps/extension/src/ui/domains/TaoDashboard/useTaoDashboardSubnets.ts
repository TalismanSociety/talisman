import { SubDTaoToken } from "@talismn/chaindata-provider"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useTokens } from "@ui/state"

import { BITTENSOR_NETWORK_ID } from "./constants"

export const useTaoDashboardSubnets = () => {
  const { t } = useTranslation()
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
      .map((token) => ({
        tokenId: token.id,
        netuid: token.netuid,
        name: token.subnetName ?? t("Subnet {{netuid}}", { netuid: token.netuid }),
        symbol: token.symbol,
        logo: token.logo,
        price: Math.random() * 10, // TODO: fetch real price
        score: Math.random() * 100, // TODO: fetch real score
      }))
      .sort((a, b) => a.netuid - b.netuid)
  }, [subnetTokens, t])
}

export type TaoDashboardSubnet = ReturnType<typeof useTaoDashboardSubnets>[number]
