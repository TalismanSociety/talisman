import type { Balances } from "@talismn/balances"
import type { Token, TokenId } from "@talismn/chaindata-provider"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { AssetBalanceCellValue } from "@ui/domains/Portfolio/AssetBalanceCellValue"
import { BondButton } from "@ui/domains/Staking/Bond/BondButton"
import type { BalancesStatus } from "@ui/hooks/useBalancesStatus"
import { cn } from "@ui/util/cn"
import { type ReactNode, Suspense } from "react"
import { useTranslation } from "react-i18next"

import type { BalanceSummary } from "../../useTokenBalancesSummary"
import { BittensorUnstakeButton } from "../BittensorUnstakeButton"
import { CopyAddressButton } from "../CopyAddressIconButton"
import { SendFundsTokenButton } from "../SendFundsTokenIconButton"
import { TokenContextMenu } from "../TokenContextMenu"
import { BittensorValidatorName } from "./BittensorValidatorName"

type TokenBalancesListProps = {
  tokenId: TokenId
  token: Token | null
  balances: Balances
  detailRowsLength: number
  chainOrNetworkId: string
  summary: BalanceSummary
  status: BalancesStatus
  children: ReactNode
  symbol: string
}

export const TokenBalancesList = ({
  tokenId,
  token,
  balances,
  detailRowsLength,
  chainOrNetworkId,
  summary,
  status,
  children,
  symbol,
}: TokenBalancesListProps) => {
  const { t } = useTranslation()

  if (!token) return null

  return (
    <div className="mb-8">
      <div
        className={cn(
          "grid grid-cols-[40%_30%_30%] bg-grey-800",
          detailRowsLength ? "rounded-t" : "rounded"
        )}
      >
        <div className="flex">
          <div className="shrink-0 p-8 pr-6 text-xl">
            <TokenLogo tokenId={tokenId} />
          </div>
          <div className="flex grow flex-col justify-center gap-2 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="truncate font-bold text-body">{token.name}</div>
              <div className="flex shrink-0 items-center font-bold text-base text-body">
                <CopyAddressButton networkId={chainOrNetworkId} />
                <BittensorUnstakeButton balances={balances} />
                <Suspense fallback={<SuspenseTracker name="ChainTokenBalances.Buttons" />}>
                  <SendFundsTokenButton tokenId={tokenId} />
                  {tokenId && (
                    <TokenContextMenu
                      tokenId={tokenId}
                      placement="bottom-start"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xs p-0 text-body-secondary text-xs opacity-50 hover:bg-grey-700 hover:text-body focus:text-body focus-visible:bg-grey-700"
                    />
                  )}
                </Suspense>
              </div>
            </div>
            <div className="flex w-full items-center gap-2 overflow-hidden">
              <NetworkLogo networkId={chainOrNetworkId} />
              <span className="truncate text-sm">
                <NetworkName networkId={chainOrNetworkId} />
                {token.type === "substrate-dtao" && (
                  <BittensorValidatorName
                    hotkey={token.hotkey}
                    prefix=" | "
                    className="text-body-secondary text-sm"
                  />
                )}
              </span>
            </div>
          </div>
        </div>
        <div>
          <AssetBalanceCellValue
            locked
            render={summary.lockedTokens.gt(0)}
            tokens={summary.lockedTokens}
            fiat={summary.lockedFiat}
            symbol={symbol}
            tooltip={t("Total Locked Balance")}
            balancesStatus={status}
            className={cn(status.status === "fetching" && "animate-pulse transition-opacity")}
          />
        </div>
        <div className="flex items-center justify-end">
          <div>
            <BondButton balances={balances} />
          </div>
          <AssetBalanceCellValue
            tokens={summary.availableTokens}
            fiat={summary.availableFiat}
            symbol={symbol}
            tooltip={t("Total Available Balance")}
            balancesStatus={status}
            className={cn(status.status === "fetching" && "animate-pulse transition-opacity")}
          />
        </div>
      </div>
      {children}
    </div>
  )
}
