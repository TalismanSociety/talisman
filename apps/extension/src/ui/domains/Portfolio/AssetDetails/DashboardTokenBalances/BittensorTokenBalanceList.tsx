import { SCALE_FACTOR } from "@talismn/balances/src/modules/SubstrateNativeModule/util/subtensor"
import { TokenId } from "@talismn/chaindata-provider"
import { type TokenRates } from "@talismn/token-rates"
import BigNumber from "bignumber.js"
import { BalanceFormatter, Balances } from "extension-core"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { type TokenBalances } from "@ui/domains/Portfolio/AssetDetails/useTokenBalances"
import { CHAIN_INFO, DTAO_LOGO, ROOT_NETUID } from "@ui/domains/Staking/Bittensor/constants"
import { type CombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useSelectedCurrency } from "@ui/state"

import { type BalanceSummary } from "../../useTokenBalancesSummary"
import { type BalanceDetailRow } from "../useTokenBalances"
import { AssetPercentageChange } from "./AssetPercentageChange"
import { TokenBalancesDetailRow } from "./TokenBalancesDetailRow"
import { TokenBalancesList } from "./TokenBalancesList"

type BittensorTokenBalanceProps = {
  groupedStakesByNetuid: BalanceDetailRow[]
  listKey: string
  combinedSubnetData: CombinedSubnetData
  tokenBalances: TokenBalances
  tokenRates: TokenRates | null
  balances: Balances
  tokenId: TokenId
}

export const BittensorTokenBalanceList = ({
  listKey,
  groupedStakesByNetuid,
  combinedSubnetData,
  tokenBalances,
  tokenRates,
  balances,
  tokenId,
}: BittensorTokenBalanceProps) => {
  const currency = useSelectedCurrency()
  const isChainIfo = listKey === CHAIN_INFO
  const isRootStake = Number(listKey) === ROOT_NETUID
  const [fistGroupStake] = groupedStakesByNetuid ?? []
  const { chainOrNetwork, summary, token, detailRows, status, networkType } = tokenBalances
  const { subnetData, isError, isLoading, isFetchingNextPage } = combinedSubnetData
  const { price_change_1_day, subnet_name } = subnetData[Number(listKey)] ?? {}

  // wait for data to load
  if (!chainOrNetwork || !summary || !token || balances.count === 0) return null

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
    groupedStakesByNetuid?.reduce<BalanceSummary>((acc, { fiat, meta: { amountStaked } = {} }) => {
      return {
        ...acc,
        lockedFiat: acc.lockedFiat! + (fiat || 0),
        lockedTokens: acc.lockedTokens.plus(
          BigNumber(amountStaked / Number(SCALE_FACTOR.toString())),
        ),
      }
    }, defaultSummary) ?? defaultSummary

  const subnetListName = `${listKey} | ${subnetName || subnet_name} ${tokenSymbol || ""}`.trim()
  const chainName = isRootStake || isChainIfo ? chainOrNetwork.name || "" : subnetListName

  const rowSummary = isChainIfo ? summary : groupSummary
  const symbol = isRootStake ? token.symbol : tokenSymbol

  const formatter = new BalanceFormatter(BigInt(alphaToTaoRate || "0"), token?.decimals, tokenRates)

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
}
