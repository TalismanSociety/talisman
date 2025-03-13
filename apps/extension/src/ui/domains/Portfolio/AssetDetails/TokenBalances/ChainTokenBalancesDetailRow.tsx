import { TokenId } from "@talismn/chaindata-provider"
import { classNames, planckToTokens } from "@talismn/util"
import { BigNumber } from "bignumber.js"

import { AssetBalanceCellValue } from "@ui/domains/Portfolio/AssetBalanceCellValue"
import { BalancesStatus } from "@ui/hooks/useBalancesStatus"

import { BalanceDetailRow } from "../useTokenBalances"
import { AssetState } from "./AssetState"
import { LockedExtra } from "./LockedExtra"

export const ChainTokenBalancesDetailRow = ({
  row,
  isLastRow,
  status,
  symbol,
  tokenId,
  tokenDecimals,
}: {
  row: BalanceDetailRow
  isLastRow?: boolean
  status: BalancesStatus
  symbol: string
  tokenId?: TokenId // unsafe, there could be multiple aggregated here
  tokenDecimals: number
}) => {
  const alphaBalanceInTao = new BigNumber(planckToTokens(row.meta?.amountTao, tokenDecimals) || "0")

  const tokenBalance = alphaBalanceInTao.gt(0) ? alphaBalanceInTao : row.tokens

  return (
    <div
      key={row.key}
      className={classNames("bg-grey-850 grid grid-cols-[40%_30%_30%]", isLastRow && "rounded-b")}
    >
      <div>
        <AssetState
          title={row.title}
          description={row.description}
          render
          address={row.address}
          isLoading={row.isLoading}
          locked={row.locked}
        />
      </div>
      {!row.locked && <div></div>}
      <div>
        <AssetBalanceCellValue
          render={tokenBalance.gt(0)}
          tokens={tokenBalance}
          fiat={row.fiat}
          symbol={symbol}
          locked={row.locked}
          balancesStatus={status}
          className={classNames(
            (status.status === "fetching" || row.isLoading) && "animate-pulse transition-opacity",
          )}
        />
      </div>
      {!!row.locked && row.meta && tokenId && (
        <LockedExtra
          tokenId={tokenId}
          address={row.address}
          isLoading={status.status === "fetching"}
          rowMeta={row.meta}
        />
      )}
    </div>
  )
}
