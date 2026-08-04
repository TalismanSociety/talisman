import { isTokenSubDTao, subDTaoTokenId } from "@talismn/chaindata-provider"
import { ROOT_NETUID } from "@ui/domains/Staking/Bittensor/utils/constants"
import { useTaoDashboardNetworkId } from "@ui/domains/TaoDashboard/shared/TaoDashboardNetworkProvider"
import { getTaoDashboardUrl } from "@ui/domains/TaoDashboard/shared/util"
import { TaoDashboardSubnetTradingUI } from "@ui/domains/TaoDashboard/subnet/TaoDashboardSubnetTradingUI"
import { useTokensMap } from "@ui/state/chaindata"
import { useMemo } from "react"
import { Navigate, useParams } from "react-router-dom"

export const TaoDashboardSubnetPage = () => {
  const { netuid } = useParams()
  const networkId = useTaoDashboardNetworkId()

  const tokens = useTokensMap()

  // check that a token exists for this subnet; root (netuid 0) has no pool to trade and its
  // stake flows go through the bond wizard, which enforces the root-stake hold gate
  const token = useMemo(() => {
    const parsedNetuid = Number(netuid)
    if (!Number.isInteger(parsedNetuid) || parsedNetuid < 0 || parsedNetuid === ROOT_NETUID)
      return null

    const tokenId = subDTaoTokenId(networkId, parsedNetuid)
    const token = tokens[tokenId]
    return isTokenSubDTao(token) ? token : null
  }, [netuid, networkId, tokens])

  if (!token) return <Navigate to={getTaoDashboardUrl(networkId)} replace />

  return <TaoDashboardSubnetTradingUI netuid={token.netuid} />
}
