import { Balances } from "@core/domains/balances/types"
import { Box } from "@talisman/components/Box"
import { IconButton } from "@talisman/components/IconButton"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import Fiat from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { PopupAssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback, useEffect, useMemo } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"

const PageContent = ({ balances, symbol }: { balances: Balances; symbol: string }) => {
  const navigate = useNavigate()
  const balancesToDisplay = useDisplayBalances(balances)
  const { token } = useTokenBalancesSummary(balancesToDisplay)

  const handleBackBtnClick = useCallback(() => navigate("/portfolio/assets"), [navigate])

  const total = useMemo(() => balancesToDisplay.sum.fiat("usd").total, [balancesToDisplay])

  return (
    <>
      <Box flex fullwidth gap={0.8} align="center">
        <IconButton onClick={handleBackBtnClick}>
          <ChevronLeftIcon />
        </IconButton>
        <Box fontsizecustom="3.6rem">
          <TokenLogo tokenId={token?.id} />
        </Box>
        <Box grow flex column gap={0.4} padding="0 0 0 0.4rem" fontsize="small">
          <Box flex justify="space-between" fg="mid">
            <Box>Asset</Box>
            <Box>Total</Box>
          </Box>
          <Box flex justify="space-between" fontsize="medium" bold>
            <Box>{symbol}</Box>
            <Box>
              <Fiat amount={total} isBalance />
            </Box>
          </Box>
        </Box>
      </Box>
      <Box padding="2.4rem 0">
        <PopupAssetDetails balances={balancesToDisplay} symbol={symbol} />
      </Box>
    </>
  )
}

export const PortfolioAsset = () => {
  const { symbol } = useParams()
  const { allBalances } = usePortfolio()
  const { popupOpenEvent } = useAnalytics()

  const balances = useMemo(
    // TODO: Move the association between a token on multiple chains into the backend / subsquid.
    // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
    // Also, we might want to separate testnet tokens from non-testnet tokens.
    () => new Balances(allBalances.sorted.filter((b) => b.token?.symbol === symbol)),
    [allBalances.sorted, symbol]
  )

  useEffect(() => {
    popupOpenEvent("portfolio asset", { symbol })
  }, [popupOpenEvent, symbol])

  if (!symbol) return <Navigate to="/portfolio" />

  return <PageContent balances={balances} symbol={symbol} />
}
