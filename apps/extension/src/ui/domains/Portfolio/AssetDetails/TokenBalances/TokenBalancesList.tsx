import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { ReactNode, Suspense } from "react"
import { useTranslation } from "react-i18next"

import { Balances } from "@extension/core"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { AssetBalanceCellValue } from "@ui/domains/Portfolio/AssetBalanceCellValue"
import { BondButton } from "@ui/domains/Staking/Bond/BondButton"
import { BalancesStatus } from "@ui/hooks/useBalancesStatus"
import { UseTokenReturnType } from "@ui/state"

import { BalanceSummary } from "../../useTokenBalancesSummary"
import { CopyAddressButton } from "../CopyAddressIconButton"
import { SendFundsTokenButton } from "../SendFundsTokenIconButton"
import { TokenContextMenu } from "../TokenContextMenu"

type TokenBalancesListProps = {
  tokenId: TokenId
  token: UseTokenReturnType
  tokenLogoUrl?: string
  balances: Balances
  detailRowsLength: number
  chainOrNetworkId: string
  chainOrNetworkName: string
  networkType?: string
  assetPriceInfo?: ReactNode
  summary: BalanceSummary
  status: BalancesStatus
  children: ReactNode
  symbol: string
  shouldDisplayActionBtns?: boolean
  shouldDisplayStakeBtn?: boolean // TODO: This prop should be removed once dTao stake is implemented
  shouldDisplayTotalAvailableBalance?: boolean
}

export const TokenBalancesList = ({
  tokenId,
  token,
  tokenLogoUrl,
  balances,
  detailRowsLength,
  chainOrNetworkId,
  chainOrNetworkName,
  networkType,
  assetPriceInfo,
  summary,
  status,
  children,
  symbol,
  shouldDisplayActionBtns = true,
  shouldDisplayStakeBtn = true,
  shouldDisplayTotalAvailableBalance = true,
}: TokenBalancesListProps) => {
  const { t } = useTranslation()

  if (!token) return null

  return (
    <div className="mb-8">
      <div
        className={classNames(
          "bg-grey-800 grid grid-cols-[40%_30%_30%]",
          detailRowsLength ? "rounded-t" : "rounded",
        )}
      >
        <div className="flex">
          <div className="shrink-0 p-8 text-xl">
            <TokenLogo tokenId={tokenId} url={tokenLogoUrl} />
          </div>
          <div className="flex grow flex-col justify-center gap-2 whitespace-nowrap">
            <div className="base text-body flex items-center font-bold">
              <ChainLogo className="mr-2" id={chainOrNetworkId} />
              <span className="mr-2">{chainOrNetworkName}</span>
              {shouldDisplayActionBtns && (
                <>
                  <CopyAddressButton networkId={chainOrNetworkId} />
                  <Suspense fallback={<SuspenseTracker name="ChainTokenBalances.Buttons" />}>
                    <SendFundsTokenButton tokenId={tokenId} />
                    {tokenId && (
                      <TokenContextMenu
                        tokenId={tokenId}
                        placement="bottom-start"
                        className="text-body-secondary hover:text-body focus:text-body hover:bg-grey-700 focus-visible:bg-grey-700 inline-flex h-9 w-9 items-center justify-center rounded-full p-0 text-xs opacity-50"
                      />
                    )}
                  </Suspense>
                </>
              )}
            </div>
            {assetPriceInfo && assetPriceInfo}
            {networkType && <div>{networkType}</div>}
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
            className={classNames(
              status.status === "fetching" && "animate-pulse transition-opacity",
            )}
          />
        </div>
        <div className="flex items-center justify-end">
          {tokenId && shouldDisplayStakeBtn && (
            <div className={classNames(!shouldDisplayTotalAvailableBalance && "pr-8")}>
              <BondButton tokenId={tokenId} balances={balances} />
            </div>
          )}
          <AssetBalanceCellValue
            render={shouldDisplayTotalAvailableBalance}
            tokens={summary.availableTokens}
            fiat={summary.availableFiat}
            symbol={symbol}
            tooltip={t("Total Available Balance")}
            balancesStatus={status}
            className={classNames(
              status.status === "fetching" && "animate-pulse transition-opacity",
            )}
          />
        </div>
      </div>
      {children}
    </div>
  )
}
