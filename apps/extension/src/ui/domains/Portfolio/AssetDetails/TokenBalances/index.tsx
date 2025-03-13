import { TokenId } from "@talismn/chaindata-provider"

import { Balances } from "@extension/core"

import { useTokenBalances } from "../useTokenBalances"
import { ChainTokenBalancesDetailRow } from "./ChainTokenBalancesDetailRow"
import { ChainTokenBalancesUniswapV2Row } from "./ChainTokenBalancesUniswapV2Row"
import { TokenBalancesList } from "./TokenBalancesList"

type TokenBalancesParams = {
  balances: Balances
  tokenId: TokenId
}

export const TokenBalances = ({ balances, tokenId }: TokenBalancesParams) => {
  const { chainOrNetwork, summary, token, detailRows, status, networkType } = useTokenBalances({
    tokenId,
    balances,
  })

  // wait for data to load
  if (!chainOrNetwork || !summary || !token || balances.count === 0) return null

  const isUniswapV2LpToken = balances.sorted[0]?.source === "evm-uniswapv2"

  return (
    <TokenBalancesList
      tokenId={tokenId}
      token={token}
      balances={balances}
      detailRowsLength={detailRows.length}
      chainOrNetworkId={chainOrNetwork.id}
      chainOrNetworkName={chainOrNetwork.name ?? ""}
      networkType={networkType}
      summary={summary}
      status={status}
    >
      {isUniswapV2LpToken &&
        balances.sorted
          .filter((balance) => balance.total.planck > 0n)
          .map((balance, i, balances) => (
            <ChainTokenBalancesUniswapV2Row
              key={balance.id}
              balance={balance}
              isLastBalance={balances.length === i + 1}
              status={status}
            />
          ))}
      {!isUniswapV2LpToken &&
        detailRows
          .filter((row) => row.tokens.gt(0))
          .map((row, i, rows) => {
            const { symbol } = token
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
}
