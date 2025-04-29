import {
  ONE_ALPHA_TOKEN,
  SCALE_FACTOR,
} from "@talismn/balances/src/modules/SubstrateNativeModule/util/subtensor"
import { TokenId } from "@talismn/chaindata-provider"
import { BalanceFormatter, Balances } from "extension-core"
import { useMemo } from "react"

import { useTokenBalances } from "@ui/domains/Portfolio/AssetDetails/useTokenBalances"
import { calculateTaoFromAlphaStaked } from "@ui/domains/Portfolio/utils/subtensor"
import { CHAIN_INFO } from "@ui/domains/Staking/Bittensor/constants"
import { sortGroupedStakes } from "@ui/domains/Staking/Bittensor/sortGroupedStakes"
import { useSelectedCurrency, useTokenRates } from "@ui/state"

import { useCombinedSubnetData } from "./useCombinedSubnetData"

type SortedGroupedStakesParams = {
  tokenId: TokenId
  balances: Balances
}

export const useSortedGroupedStakes = ({ balances, tokenId }: SortedGroupedStakesParams) => {
  const tokenRates = useTokenRates(tokenId)
  const { subnetData } = useCombinedSubnetData()
  const currency = useSelectedCurrency()
  const tokenBalances = useTokenBalances({
    tokenId,
    balances,
  })

  const sortedGroupedStakes = useMemo(() => {
    const { token } = tokenBalances

    const stakesWithFiatFallback = tokenBalances.detailRows.map((stake) => {
      const { fiat, meta: { alphaToTaoRate, netuid, amountStaked } = {} } = stake

      let fiatAmount = fiat

      // If alphaToTaoRate is 0, means the balances lib failed to decode the dynamic info of the subnet.
      // In this case we need to calculate the fiat value on the frontend using pool info from tao stats.
      if (!Number(alphaToTaoRate) && netuid) {
        const { total_tao, alpha_in_pool } = subnetData[Number(netuid)] ?? {}

        const alphaToTaoRateTaoStats = calculateTaoFromAlphaStaked({
          alphaIn: Number(alpha_in_pool),
          taoIn: Number(total_tao),
          alphaStaked: Number(ONE_ALPHA_TOKEN.toString()), // use exactly 1 alpha token to get the rate of Alpha to Tao token
        })

        const alphaAmountInTao = Math.trunc(
          alphaToTaoRateTaoStats * ((amountStaked || 0) / Number(SCALE_FACTOR.toString())),
        )

        const formatter = new BalanceFormatter(
          BigInt(alphaAmountInTao.toString()),
          token?.decimals,
          tokenRates,
        )
        fiatAmount = formatter.fiat(currency)
      }
      return {
        ...stake,
        fiat: fiatAmount,
      }
    })

    const groupedStakes = Object.groupBy(
      stakesWithFiatFallback,
      ({ meta }) => meta?.netuid ?? CHAIN_INFO,
    )

    return sortGroupedStakes(groupedStakes, CHAIN_INFO)
  }, [currency, subnetData, tokenBalances, tokenRates])

  return { sortedGroupedStakes }
}
