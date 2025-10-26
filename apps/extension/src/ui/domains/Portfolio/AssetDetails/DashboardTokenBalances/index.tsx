import { Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"

// import { BITTENSOR_TOKEN_ID } from "@ui/domains/Staking/Bittensor/utils/constants"

import { useTokenBalances } from "../useTokenBalances"
// import { BittensorTokenBalances } from "./BittensorTokenBalances"
import { ChainTokenBalancesUniswapV2Row } from "./ChainTokenBalancesUniswapV2Row"
import { TokenBalancesDetailRow } from "./TokenBalancesDetailRow"
import { TokenBalancesList } from "./TokenBalancesList"

type TokenBalancesParams = {
  balances: Balances
  tokenId: TokenId
}

export const TokenBalances = ({ balances, tokenId }: TokenBalancesParams) => {
  const {
    network: chainOrNetwork,
    summary,
    token,
    detailRows,
    status,
  } = useTokenBalances({
    tokenId,
    balances,
  })

  // useEffect(() => {
  //   console.log("balances", { balances: balances.toJSON() })
  // }, [balances])

  // wait for data to load
  if (!chainOrNetwork || !summary || !token || balances.count === 0) return null

  const isUniswapV2LpToken = balances.sorted[0]?.source === "evm-uniswapv2"

  // if (tokenId === BITTENSOR_TOKEN_ID) {
  //   return <BittensorTokenBalances tokenId={tokenId} balances={balances} />
  // }

  return (
    <>
      <TokenBalancesList
        tokenId={tokenId}
        token={token}
        balances={balances}
        detailRowsLength={detailRows.length}
        chainOrNetworkId={chainOrNetwork.id}
        summary={summary}
        status={status}
        symbol={token.symbol}
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
              return (
                <TokenBalancesDetailRow
                  key={row.key}
                  row={row}
                  isLastRow={rows.length === i + 1}
                  symbol={token.symbol}
                  status={status}
                  tokenId={tokenId}
                  tokenDecimals={token.decimals}
                />
              )
            })}
      </TokenBalancesList>
      {/* {tokenId === BITTENSOR_TOKEN_ID && (
        <>
          <div>==================== BEGIN LEGACY ======================</div>
          <BittensorTokenBalances tokenId={tokenId} balances={balances} />
          <div>==================== END LEGACY ======================</div>
        </>
      )} */}
    </>
  )
}
