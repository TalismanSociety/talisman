import type { TokenId } from "@talismn/chaindata-provider"
import { AssetBalanceCellValue } from "@ui/domains/Portfolio/AssetBalanceCellValue"
import type { BalancesStatus } from "@ui/hooks/useBalancesStatus"
import { cn } from "@ui/util/cn"

import { ConvictionLockValidatorTag } from "../ConvictionLockValidatorTag"
import type { BalanceDetailRow } from "../useTokenBalances"
import { AssetState } from "./AssetState"
import { LockedExtra } from "./LockedExtra"

export const TokenBalancesDetailRow = ({
  row,
  isLastRow,
  status,
  symbol,
  tokenId,
}: {
  row: BalanceDetailRow
  isLastRow?: boolean
  status: BalancesStatus
  symbol: string
  tokenId: TokenId
}) => {
  return (
    <div
      key={row.key}
      className={cn("grid grid-cols-[40%_30%_30%] bg-grey-850", isLastRow && "rounded-b")}
    >
      <div>
        <AssetState
          title={row.title}
          titleSuffix={
            row.lockHotkey ? <ConvictionLockValidatorTag hotkey={row.lockHotkey} /> : undefined
          }
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
          render
          tokens={row.tokens}
          fiat={row.fiat}
          symbol={symbol}
          locked={row.locked}
          balancesStatus={status}
          className={cn(
            (status.status === "fetching" || row.isLoading) && "animate-pulse transition-opacity"
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
