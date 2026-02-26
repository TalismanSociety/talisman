import { isTokenSubDTao, subDTaoTokenId } from "@talismn/chaindata-provider"
import { TaoDashboardSubnetTradingUI } from "@ui/domains/TaoDashboard/subnet/TaoDashboardSubnetTradingUI"
import { BITTENSOR_NETWORK_ID } from "@ui/domains/TaoDashboard/subnets/constants"
import { useTokensMap } from "@ui/state"
import { useMemo } from "react"
import { Navigate, useParams } from "react-router-dom"

export const TaoDashboardSubnetPage = () => {
  const { netuid } = useParams()

  const tokens = useTokensMap()

  // check that a token exists for this subnet
  const token = useMemo(() => {
    const parsedNetuid = Number(netuid)
    if (!Number.isInteger(parsedNetuid) || parsedNetuid < 0) return null

    const tokenId = subDTaoTokenId(BITTENSOR_NETWORK_ID, parsedNetuid)
    const token = tokens[tokenId]
    return isTokenSubDTao(token) ? token : null
  }, [netuid, tokens])

  if (!token) return <Navigate to="/bittensor/subnets" replace />

  return <TaoDashboardSubnetTradingUI netuid={token.netuid} />
}
