import { SCALE_FACTOR } from "@talismn/balances/src/modules/SubstrateNativeModule/util/subtensor"
import { TokenId } from "@talismn/chaindata-provider"
import BigNumber from "bignumber.js"
import { BalanceFormatter, Balances } from "extension-core"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { CHAIN_INFO, DTAO_LOGO, ROOT_NETUID } from "@ui/domains/Staking/Bittensor/constants"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useSelectedCurrency, useTokenRates } from "@ui/state"

import { type BalanceSummary } from "../../useTokenBalancesSummary"
import { BalanceDetailRow, useTokenBalances } from "../useTokenBalances"
import { AssetPercentageChange } from "./AssetPercentageChange"
import { TokenBalancesDetailRow } from "./TokenBalancesDetailRow"
import { TokenBalancesList } from "./TokenBalancesList"

type TokenBalancesParams = {
  tokenId: TokenId
  balances: Balances
}

export const BittensorTokenBalances = ({ balances, tokenId }: TokenBalancesParams) => {
  const tokenRates = useTokenRates(tokenId)
  const currency = useSelectedCurrency()
  const { subnetData, isError, isLoading, isFetchingNextPage } = useCombinedSubnetData()
  const { chainOrNetwork, summary, token, detailRows, status, networkType } = useTokenBalances({
    tokenId,
    balances,
  })

  // wait for data to load
  if (!chainOrNetwork || !summary || !token || balances.count === 0) return null

  const groupedStakes = Object.groupBy(detailRows, ({ meta }) => meta?.netuid ?? CHAIN_INFO)

  const sortObjectEntries = (
    obj: Partial<Record<string | number, BalanceDetailRow[]>>,
    firstKey: string,
  ) => {
    return Object.entries(obj).sort(([keyA], [keyB]) => {
      if (keyA === firstKey) return -1 // Place firstKey at the top
      if (keyB === firstKey) return 1

      const numA = Number(keyA)
      const numB = Number(keyB)

      // Sort numeric keys as numbers
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }

      // Sort remaining keys alphabetically
      return keyA.localeCompare(keyB, undefined, { numeric: true })
    })
  }

  const sortedGroupedStakes = sortObjectEntries(groupedStakes, CHAIN_INFO)

  return sortedGroupedStakes.map(([key, groupedStakesByNetuid], i) => {
    const isChainIfo = key === CHAIN_INFO
    const isRootStake = Number(key) === ROOT_NETUID
    const [fistGroupStake] = groupedStakesByNetuid ?? []
    const { price_change_1_day } = subnetData[Number(key)] ?? {}

    // Destruct data from the first stake in the group, as the data is the destructed data is the  same for all stakes in the group
    const {
      meta: {
        alphaToTaoRate,
        dynamicInfo: { subnetIdentity: { subnetName } = {}, tokenSymbol } = {},
      } = {},
    } = fistGroupStake

    const defaultSummary = {
      availableFiat: 0,
      availableTokens: BigNumber(0),
      lockedFiat: 0,
      lockedTokens: BigNumber(0),
      totalFiat: 0,
      totalTokens: BigNumber(0),
    }

    const groupSummary =
      groupedStakesByNetuid?.reduce<BalanceSummary>(
        (acc, { fiat, meta: { amountStaked } = {} }) => {
          return {
            ...acc,
            lockedFiat: acc.lockedFiat! + (fiat || 0),
            lockedTokens: acc.lockedTokens.plus(
              BigNumber(amountStaked / Number(SCALE_FACTOR.toString())),
            ),
          }
        },
        defaultSummary,
      ) ?? defaultSummary

    const subnetListName = `${key} | ${subnetName || ""} ${tokenSymbol || ""}`.trim()
    const chainName = isRootStake || isChainIfo ? chainOrNetwork.name || "" : subnetListName

    const rowSummary = isChainIfo ? summary : groupSummary
    const symbol = isRootStake ? token.symbol : tokenSymbol

    const formatter = new BalanceFormatter(
      BigInt(alphaToTaoRate || "0"),
      token?.decimals,
      tokenRates,
    )

    const assetPriceInfo = !isRootStake && !isChainIfo && (
      <div className="flex items-center space-x-2">
        <Fiat amount={formatter?.fiat(currency) ?? 0} noCountUp />
        <AssetPercentageChange
          priceChange={price_change_1_day}
          isError={isError}
          isLoading={isFetchingNextPage || isLoading}
        />
      </div>
    )

    const rowNetworkType = isChainIfo ? networkType : isRootStake ? "Root" : ""

    return (
      <TokenBalancesList
        key={i}
        tokenId={tokenId}
        token={token}
        tokenLogoUrl={!isChainIfo && !isRootStake ? DTAO_LOGO : undefined}
        balances={balances}
        detailRowsLength={detailRows.length}
        chainOrNetworkId={chainOrNetwork.id}
        chainOrNetworkName={chainName}
        assetPriceInfo={assetPriceInfo}
        networkType={rowNetworkType}
        summary={rowSummary}
        status={status}
        symbol={symbol}
        shouldDisplayActionBtns={isChainIfo}
        shouldDisplayStakeBtn={isChainIfo || isRootStake}
        shouldDisplayTotalAvailableBalance={isChainIfo}
      >
        {groupedStakesByNetuid?.map((row, i, rows) => {
          const { meta: { dynamicInfo = {} } = {}, title } = row

          const balanceDetailSymbol = title.toLowerCase().includes("subnet")
            ? dynamicInfo?.tokenSymbol
            : symbol

          return (
            <TokenBalancesDetailRow
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
