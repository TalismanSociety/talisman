import { TokenId } from "@talismn/chaindata-provider"
import { LockIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { BalancesStatus } from "@ui/hooks/useBalancesStatus"

import { StaleBalancesIcon } from "../../StaleBalancesIcon"
import { PortfolioAccount } from "../PortfolioAccount"
import { BalanceDetailRow } from "../useTokenBalances"
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
      className={classNames(
        "bg-black-secondary flex w-full items-center gap-8 px-7 py-6",
        isLastRow && "rounded-b-sm",
      )}
    >
      <div className="flex grow flex-col justify-center gap-2 overflow-hidden">
        <div className="flex h-10 w-full items-center gap-2 font-bold text-white">
          <div className="truncate capitalize">{row.title}</div>
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
          <div className="bg-grey-800 rounded-xs h-[1.4rem] max-w-48 animate-pulse" />
        )}
        {!row.address && row.description && (
          <div className="text-left text-xs">
            <Tooltip>
              <TooltipTrigger className="max-w-full truncate">{row.description}</TooltipTrigger>
              <TooltipContent className="rounded-xs text-body-secondary border-grey-700 z-20 border-[0.5px] bg-black p-3 text-[1.1rem] shadow">
                {row.description}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
      <div
        className={classNames(
          "flex flex-col flex-nowrap items-end justify-center gap-2 whitespace-nowrap",
          status.status === "fetching" && "animate-pulse transition-opacity",
        )}
      >
        <div
          className={classNames(
            "flex h-10 items-center gap-2 font-bold",
            row.locked ? "text-body-secondary" : "text-white",
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
