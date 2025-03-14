import { TokenId } from "@talismn/chaindata-provider"
import { BalanceFormatter, Balances } from "extension-core"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { ROOT_NETUID } from "@ui/domains/Staking/Bittensor/constants"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useSelectedCurrency, useTokenRates } from "@ui/state"

import { useTokenBalances } from "../useTokenBalances"
import { AssetPercentageChange } from "./AssetPercentageChange"
// import { ChainTokenBalancesDetailRow } from "./ChainTokenBalancesDetailRow"
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
    const [fistGroupStake] = groupedStakes[key]!

    const { price_change_1_day } = subnetData[Number(key)] ?? {}

    const {
      meta: {
        alphaToTaoRate,
        dynamicInfo: { subnetIdentity: { subnetName } = {}, tokenSymbol } = {},
      } = {},
    } = fistGroupStake

    const subnetListName = `${key} | ${subnetName} ${tokenSymbol}`
    const chainName = isDefaultGroup ? chainOrNetwork.name || "" : subnetListName

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
        summary={summary}
        status={status}
        shouldDisplayChainLogo={false}
      >
        {" "}
        <div>banana</div>
      </TokenBalancesList>
    )
  })

  // return (
  //   <TokenBalancesList
  //     tokenId={tokenId}
  //     token={token}
  //     balances={balances}
  //     detailRowsLength={detailRows.length}
  //     chainOrNetworkId={chainOrNetwork.id}
  //     chainOrNetworkName={chainOrNetwork.name ?? ""}
  //     networkType={networkType}
  //     summary={summary}
  //     status={status}
  //   >
  //     {detailRows
  //       .filter((row) => row.tokens.gt(0))
  //       .map((row, i, rows) => {
  //         const { symbol } = token
  //         const { meta: { dynamicInfo = {} } = {}, title } = row

  //         const balanceDetailSymbol = title.toLowerCase().includes("subnet")
  //           ? dynamicInfo?.tokenSymbol
  //           : symbol

  //         return (
  //           <ChainTokenBalancesDetailRow
  //             key={row.key}
  //             row={row}
  //             isLastRow={rows.length === i + 1}
  //             symbol={balanceDetailSymbol}
  //             status={status}
  //             tokenId={tokenId}
  //             tokenDecimals={token.decimals}
  //           />
  //         )
  //       })}
  //   </TokenBalancesList>
  // )
}
