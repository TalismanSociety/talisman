import { Balances } from "@core/domains/balances/types"
import { ChevronLeftIcon, CopyIcon, SendIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { DashboardAssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

const PageContent = ({ balances, symbol }: { balances: Balances; symbol: string }) => {
  const navigate = useNavigate()
  const balancesToDisplay = useDisplayBalances(balances)
  const { token, summary } = useTokenBalancesSummary(balancesToDisplay)
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const { genericEvent } = useAnalytics()
  const { account } = useSelectedAccount()

  // don't set the token id here because it could be one of many
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(account)

  const handleCopyAddressClick = useCallback(() => {
    openCopyAddressModal({ mode: "copy", address: account?.address })
    genericEvent("open copy address", { from: "dashboard portfolio" })
  }, [account?.address, genericEvent, openCopyAddressModal])

  const handleSendFundsClick = useCallback(() => {
    openSendFundsPopup()
    genericEvent("open send funds", { from: "dashboard portfolio" })
  }, [openSendFundsPopup, genericEvent])

  const handleBackBtnClick = useCallback(() => navigate("/portfolio"), [navigate])
  const { t } = useTranslation()

  return (
    <div>
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
          <div className="flex items-center gap-4">
            <div className="w-12 shrink-0 text-lg">
              <TokenLogo tokenId={token?.id} />
            </div>
            <div className="text-md">{token?.symbol}</div>
            <div className="flex flex-wrap">
              <Tooltip>
                <TooltipTrigger
                  onClick={handleCopyAddressClick}
                  className="hover:bg-grey-800 text-body-secondary hover:text-body flex h-12 w-12 flex-col items-center justify-center rounded-full text-sm"
                >
                  <CopyIcon />
                </TooltipTrigger>
                <TooltipContent>{t("Copy address")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  onClick={canSendFunds ? handleSendFundsClick : undefined}
                  className={classNames(
                    "text-body-secondary flex h-12 w-12 flex-col items-center justify-center rounded-full text-sm",
                    canSendFunds ? "hover:bg-grey-800 hover:text-body" : "cursor-default opacity-50"
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
      </div>
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
