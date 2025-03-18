import { SCALE_FACTOR } from "@talismn/balances/src/modules/SubstrateNativeModule/util/subtensor"
import { TokenId } from "@talismn/chaindata-provider"
import BigNumber from "bignumber.js"
import { BalanceFormatter, Balances } from "extension-core"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { ROOT_NETUID } from "@ui/domains/Staking/Bittensor/constants"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useSelectedCurrency, useTokenRates } from "@ui/state"

import { type BalanceSummary } from "../../useTokenBalancesSummary"
import { useTokenBalances } from "../useTokenBalances"
import { AssetPercentageChange } from "./AssetPercentageChange"
import { ChainTokenBalancesDetailRow } from "./ChainTokenBalancesDetailRow"
import { TokenBalancesList } from "./TokenBalancesList"

type TokenBalancesParams = {
  tokenId: TokenId
  balances: Balances
}

export const BittensorTokenBalances = ({ balances, tokenId }: TokenBalancesParams) => {
  const tokenRates = useTokenRates(tokenId)
  const currency = useSelectedCurrency()
  const { subnetData, isError, isLoading, isFetchingNextPage } = useCombinedSubnetData()
  const { chainOrNetwork, summary, token, detailRows, status } = useTokenBalances({
    tokenId,
    balances,
  })

  // wait for data to load
  if (!chainOrNetwork || !summary || !token || balances.count === 0) return null

  // Rows that are not should be defaulted to 0 and be grouped with Rootnet stakes
  const groupedStakes = Object.groupBy(detailRows, ({ meta }) => meta?.netuid ?? ROOT_NETUID)

  return Object.keys(groupedStakes).map((key, i) => {
    const isDefaultGroup = Number(key) === ROOT_NETUID
    const groupedStakesByNetuid = groupedStakes[key]!
    const [fistGroupStake] = groupedStakesByNetuid
    const { price_change_1_day } = subnetData[Number(key)] ?? {}

    // Destruct data from the first stake in the group, as the data is the destructed data is the  same for all stakes in the group
    const {
      meta: {
        alphaToTaoRate,
        dynamicInfo: { subnetIdentity: { subnetName } = {}, tokenSymbol } = {},
      } = {},
    } = fistGroupStake

    const groupSummary = groupedStakesByNetuid.reduce<BalanceSummary>(
      (acc, { fiat, meta: { amountStaked } = {} }) => {
        return {
          ...acc,
          lockedFiat: acc.lockedFiat! + (fiat || 0),
          lockedTokens: acc.lockedTokens.plus(
            BigNumber(amountStaked / Number(SCALE_FACTOR.toString())),
          ),
        }
      },
      {
        availableFiat: 0,
        availableTokens: BigNumber(0),
        lockedFiat: 0,
        lockedTokens: BigNumber(0),
        totalFiat: 0,
        totalTokens: BigNumber(0),
      },
    )

    const subnetListName = `${key} | ${subnetName || ""} ${tokenSymbol || ""}`.trim()
    const chainName = isDefaultGroup ? chainOrNetwork.name || "" : subnetListName

    const rowSummary = isDefaultGroup ? summary : groupSummary
    const symbol = isDefaultGroup ? token.symbol : tokenSymbol

    const formatter = new BalanceFormatter(
      BigInt(alphaToTaoRate || "0"),
      token?.decimals,
      tokenRates,
    )

    const assetPriceInfo = isDefaultGroup ? (
      <div>Root</div>
    ) : (
      <div className="flex items-center space-x-2">
        <Fiat amount={formatter?.fiat(currency) ?? 0} noCountUp />
        <AssetPercentageChange
          priceChange={price_change_1_day}
          isError={isError}
          isLoading={isFetchingNextPage || isLoading}
        />
      </div>
    )

    return (
      <TokenBalancesList
        key={i}
        tokenId={tokenId}
        token={token}
        balances={balances}
        detailRowsLength={detailRows.length}
        chainOrNetworkId={chainOrNetwork.id}
        chainOrNetworkName={chainName}
        assetPriceInfo={assetPriceInfo}
        summary={rowSummary}
        status={status}
        shouldDisplayChainLogo={false}
        symbol={symbol}
      >
        {groupedStakesByNetuid.map((row, i, rows) => {
          const { meta: { dynamicInfo = {} } = {}, title } = row

          const balanceDetailSymbol = title.toLowerCase().includes("subnet")
            ? dynamicInfo?.tokenSymbol
            : symbol

          return (
            <ChainTokenBalancesDetailRow
              key={row.key}
              row={row}
              isLastRow={rows.length === i + 1}
              symbol={balanceDetailSymbol}
              status={status}
              tokenId={tokenId}
              tokenDecimals={token.decimals}
            />
          )
        })}
      </TokenBalancesList>
    )
  })
}
