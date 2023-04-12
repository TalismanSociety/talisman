import { Balances } from "@core/domains/balances/types"
import { ChevronLeftIcon, CopyIcon, PaperPlaneIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { DashboardAssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback, useEffect, useMemo } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"

const PageContent = ({ balances, symbol }: { balances: Balances; symbol: string }) => {
  const navigate = useNavigate()
  const balancesToDisplay = useDisplayBalances(balances)
  const { token, summary } = useTokenBalancesSummary(balancesToDisplay)
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const { genericEvent } = useAnalytics()

  const handleCopyAddressClick = useCallback(() => {
    openCopyAddressModal({ mode: "copy" })
    genericEvent("open copy address", { from: "dashboard portfolio" })
  }, [genericEvent, openCopyAddressModal])

  const handleSendFundsClick = useCallback(() => {
    api.sendFundsOpen()
    genericEvent("open send funds", { from: "dashboard portfolio" })
  }, [genericEvent])

  const handleBackBtnClick = useCallback(() => navigate("/portfolio"), [navigate])

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
            <span className="text-sm">Asset</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 shrink-0 text-lg">
              <TokenLogo tokenId={token?.id} />
            </div>
            <div className="text-md">{token?.symbol}</div>
            <div className="flex flex-wrap">
              <button
                onClick={handleCopyAddressClick}
                className="hover:bg-grey-800 text-body-secondary hover:text-body flex h-12 w-12 flex-col items-center justify-center rounded-full text-sm"
              >
                <CopyIcon />
              </button>
              <button
                onClick={handleSendFundsClick}
                className="hover:bg-grey-800 text-body-secondary hover:text-body flex h-12 w-12 flex-col items-center justify-center rounded-full text-sm"
              >
                <PaperPlaneIcon />
              </button>
            </div>
          </div>
        </div>
        <Statistics
          className="max-w-[40%]"
          title="Total Asset Value"
          tokens={summary.totalTokens}
          fiat={summary.totalFiat}
          token={token}
          showTokens
        />
        <Statistics
          className="max-w-[40%]"
          title="Locked"
          tokens={summary.lockedTokens}
          fiat={summary.lockedFiat}
          token={token}
          locked
          showTokens
        />
        <Statistics
          className="max-w-[40%]"
          title="Available"
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
  const { allBalances } = usePortfolio()
  const { pageOpenEvent } = useAnalytics()

  const balances = useMemo(
    // TODO: Move the association between a token on multiple chains into the backend / subsquid.
    // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
    // Also, we might want to separate testnet tokens from non-testnet tokens.
    () => new Balances(allBalances.sorted.filter((b) => b.token?.symbol === symbol)),
    [allBalances.sorted, symbol]
  )

  useEffect(() => {
    pageOpenEvent("portfolio asset", { symbol })
  }, [pageOpenEvent, symbol])

  if (!symbol) return <Navigate to="/portfolio" />

  return <PageContent balances={balances} symbol={symbol} />
}
