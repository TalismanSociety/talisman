import { Balances } from "@extension/core"
import { ChevronLeftIcon, SendIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { DashboardAssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { usePortfolio } from "@ui/domains/Portfolio/usePortfolio"
import { useSelectedAccount } from "@ui/domains/Portfolio/useSelectedAccount"
import { useTokenBalancesSummary } from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { FC, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

const AssetStats: FC<{ balances: Balances; symbol: string }> = ({ balances, symbol }) => {
  const navigate = useNavigate()
  const { token, rate, summary } = useTokenBalancesSummary(balances)
  const { genericEvent } = useAnalytics()
  const { account } = useSelectedAccount()

  // don't set the token id here because it could be one of many
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(
    account,
    undefined,
    symbol
  )

  const canHaveLockedState = Boolean(token?.chain?.id)

  const handleSendFundsClick = useCallback(() => {
    openSendFundsPopup()
    genericEvent("open send funds", { from: "dashboard portfolio" })
  }, [openSendFundsPopup, genericEvent])

  const handleBackBtnClick = useCallback(() => navigate("/portfolio/tokens"), [navigate])
  const { t } = useTranslation()

  return (
    <div className="flex h-48 w-full gap-8">
      <div className="flex grow flex-col justify-center gap-8">
        <button
          className="text-body-secondary hover:text-grey-300 text:text-sm flex cursor-pointer items-center whitespace-nowrap bg-none p-0 text-base"
          type="button"
          onClick={handleBackBtnClick}
        >
          <ChevronLeftIcon />
          <span className="text-sm">{t("Asset")}</span>
        </button>
        <div className="flex items-center gap-6">
          <div className="text-3xl">
            <TokenLogo tokenId={token?.id} className="text-3xl" />
          </div>
          <div>
            <div className="text-md">{token?.symbol}</div>
            {rate && <Fiat amount={rate} className="text-body-secondary" />}
          </div>
          <div className="flex flex-wrap">
            <Tooltip>
              <TooltipTrigger
                onClick={canSendFunds ? handleSendFundsClick : undefined}
                className={classNames(
                  "text-body-secondary flex h-12 w-12 flex-col items-center justify-center rounded-full text-sm",
                  canSendFunds
                    ? "hover:bg-grey-800 focus-visible:bg-grey-800 hover:text-body"
                    : "cursor-default opacity-50"
                )}
              >
                <SendIcon />
              </TooltipTrigger>
              <TooltipContent>{canSendFunds ? t("Send") : cannotSendFundsReason}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      <Statistics
        className="max-w-[40%]"
        title={t("Total Asset Value")}
        tokens={summary.totalTokens}
        fiat={summary.totalFiat}
        token={token}
        showTokens
      />
      {canHaveLockedState && (
        <>
          <Statistics
            className="max-w-[40%]"
            title={t("Locked")}
            tokens={summary.lockedTokens}
            fiat={summary.lockedFiat}
            token={token}
            locked
            showTokens
          />
          <Statistics
            className="max-w-[40%]"
            title={t("Available")}
            tokens={summary.availableTokens}
            fiat={summary.availableFiat}
            token={token}
            showTokens
          />
        </>
      )}
    </div>
  )
}

const PageContent: FC<{ balances: Balances; symbol: string }> = ({ balances, symbol }) => {
  const balancesToDisplay = useDisplayBalances(balances) // TODO atom

  return (
    <div>
      <AssetStats balances={balancesToDisplay} symbol={symbol} />
      <div className="mt-24">
        <DashboardAssetDetails balances={balancesToDisplay} symbol={symbol} />
      </div>
    </div>
  )
}

export const PortfolioAsset = () => {
  const { symbol } = useParams()
  const [search] = useSearchParams()
  const { allBalances } = usePortfolio()
  const { pageOpenEvent } = useAnalytics()
  const isTestnet = search.get("testnet") === "true"

  const balances = useMemo(
    // TODO: Move the association between a token on multiple chains into the backend / subsquid.
    // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
    () => allBalances.find((b) => b.token?.symbol === symbol && b.token?.isTestnet === isTestnet),
    [allBalances, isTestnet, symbol]
  )

  useEffect(() => {
    pageOpenEvent("portfolio asset", { symbol })
  }, [pageOpenEvent, symbol])

  if (!symbol) return <Navigate to="/portfolio" />

  return <PageContent balances={balances} symbol={symbol} />
}
