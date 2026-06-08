import type { TokenId } from "@talismn/chaindata-provider"
import { LockIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import type { BalancesStatus } from "@ui/hooks/useBalancesStatus"
import { cn } from "@ui/util/cn"

import { StaleBalancesIcon } from "../../StaleBalancesIcon"
import { ConvictionLockHotkeyTag } from "../ConvictionLockHotkeyTag"
import { PortfolioAccount } from "../PortfolioAccount"
import type { BalanceDetailRow } from "../useTokenBalances"
import { LockedExtra } from "./LockedExtra"

type TokenBalancesDetailRowProps = {
  row: BalanceDetailRow
  isLastRow?: boolean
  status: BalancesStatus
  symbol: string
  tokenId: TokenId
}

export const TokenBalancesDetailRow = ({
  row,
  isLastRow,
  status,
  symbol,
  tokenId,
}: TokenBalancesDetailRowProps) => {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-8 bg-black-secondary px-7 py-6",
        isLastRow && "rounded-b-sm"
      )}
    >
      <div className="flex grow flex-col justify-center gap-2 overflow-hidden">
        <div className="flex h-10 w-full items-center gap-2 font-bold text-white">
          <div className="shrink-0 truncate capitalize">{row.title}</div>
          {row.lockHotkey && <ConvictionLockHotkeyTag hotkey={row.lockHotkey} />}
          {!!row.locked && tokenId && row.meta && (
            <LockedExtra
              tokenId={tokenId}
              address={row.address}
              isLoading={status.status === "fetching" || !!row.isLoading}
              rowMeta={row.meta}
            />
          )}
        </div>
        {!!row.address && (
          <div className="text-xs">
            <PortfolioAccount address={row.address} />
          </div>
        )}
        {!row.address && row.isLoading && !row.description && row.locked && (
          <div className="h-7 max-w-48 animate-pulse rounded-xs bg-grey-800" />
        )}
        {!row.address && row.description && (
          <div className="text-left text-xs">
            <Tooltip>
              <TooltipTrigger className="max-w-full truncate">{row.description}</TooltipTrigger>
              <TooltipContent className="z-20 rounded-xs border-[0.5px] border-grey-700 bg-black p-3 text-[0.6875rem] text-body-secondary shadow-xs">
                {row.description}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex flex-col flex-nowrap items-end justify-center gap-2 whitespace-nowrap",
          status.status === "fetching" && "animate-pulse transition-opacity"
        )}
      >
        <div
          className={cn(
            "flex h-10 items-center gap-2 font-bold",
            row.locked ? "text-body-secondary" : "text-white"
          )}
        >
          <Tokens amount={row.tokens} symbol={symbol} isBalance />
          {row.locked ? <LockIcon className="lock shrink-0" /> : null}
          {status.status === "stale" ? (
            <StaleBalancesIcon className="shrink-0" staleChains={status.staleChains} />
          ) : null}
        </div>
        <div className="text-xs">
          {row.fiat === null ? "-" : <Fiat amount={row.fiat} isBalance />}
        </div>
      </div>
    </div>
  )
}
