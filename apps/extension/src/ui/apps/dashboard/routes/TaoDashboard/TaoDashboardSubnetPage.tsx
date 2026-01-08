import { isTokenSubDTao, subDTaoTokenId } from "@talismn/chaindata-provider"
import { useMemo } from "react"
import { Navigate, useParams } from "react-router-dom"

import { BITTENSOR_NETWORK_ID } from "@ui/domains/TaoDashboard/constants"
import { TaoDashboardSubnetTradingUI } from "@ui/domains/TaoDashboard/subnet/TaoDashboardSubnetTradingUI"
import { useTokensMap } from "@ui/state"

export const TaoDashboardSubnetPage = () => {
  const { netuid } = useParams()

  const tokens = useTokensMap()

  // check that a token exists for this subnet
  const token = useMemo(() => {
    if (!Number(netuid)) return null
    const tokenId = subDTaoTokenId(BITTENSOR_NETWORK_ID, Number(netuid))
    const token = tokens[tokenId]
    return isTokenSubDTao(token) ? token : null
  }, [netuid, tokens])

  if (!token) return <Navigate to="/bittensor/subnets" replace />

  return <TaoDashboardSubnetTradingUI netuid={token.netuid} />
}
