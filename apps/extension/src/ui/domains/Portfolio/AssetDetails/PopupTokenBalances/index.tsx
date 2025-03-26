import { TokenId } from "@talismn/chaindata-provider"
import { Balances } from "extension-core"

import { useTokenBalances } from "../useTokenBalances"
import { BittensorTokenBalances } from "./BittensorTokenBalances"
import { TokenBalancesDetailRow } from "./TokenBalancesDetailRow"
import { TokenBalancesList } from "./TokenBalancesList"
import { TokenBalancesUniswapV2Row } from "./TokenBalancesUniswapV2Row"

const BITTENSOR_TOKEN_ID = "bittensor-substrate-native"

type TokenBalancesParams = {
  balances: Balances
  tokenId: TokenId
}

export const PopupTokenBalances = ({ balances, tokenId }: TokenBalancesParams) => {
  const { chainOrNetwork, summary, token, detailRows, status, networkType } = useTokenBalances({
    tokenId,
    balances,
  })

  // wait for data to load
  if (!chainOrNetwork || !summary || !token || balances.count === 0) return null

  if (tokenId === BITTENSOR_TOKEN_ID) {
    return <BittensorTokenBalances tokenId={tokenId} balances={balances} />
  }

  const isUniswapV2LpToken = balances.sorted[0]?.source === "evm-uniswapv2"

  return (
    <TokenBalancesList
      tokenId={tokenId}
      balances={balances}
      detailRowsLength={detailRows.length}
      chainOrNetworkId={chainOrNetwork.id}
      chainOrNetworkName={chainOrNetwork.name ?? ""}
      networkType={networkType}
    >
      {isUniswapV2LpToken &&
        balances.sorted
          .filter((balance) => balance.total.planck > 0n)
          .map((balance, i, balances) => (
            <TokenBalancesUniswapV2Row
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
