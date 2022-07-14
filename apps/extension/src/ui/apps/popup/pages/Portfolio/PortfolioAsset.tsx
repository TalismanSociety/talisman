import { Balances } from "@core/domains/balances/types"
import { Box } from "@talisman/components/Box"
import { IconButton } from "@talisman/components/IconButton"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { PopupAssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/hooks/useTokenBalancesSummary"
import React, { useCallback, useMemo } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import styled from "styled-components"

// memoise to re-render only if balances object changes
const PageContent = React.memo(({ balances, symbol }: { balances: Balances; symbol: string }) => {
  const navigate = useNavigate()
  const balancesToDisplay = useDisplayBalances(balances)
  const { token } = useTokenBalancesSummary(balancesToDisplay, symbol)

  const handleBackBtnClick = useCallback(() => navigate("/portfolio/assets"), [navigate])

  return (
    <Box margin="0 0 1.6rem 0" flex column gap={1.6}>
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
          <Box flex justify="space-between" bold>
            <Box>DOT</Box>
            <Box>15 $</Box>
          </Box>
        </Box>
      </Box>
      <PopupAssetDetails balances={balancesToDisplay} symbol={symbol} />
    </Box>
  )
})

export const PortfolioAsset = () => {
  const { symbol } = useParams()
  const { allBalances } = usePortfolio()

  const balances = useMemo(
    () => new Balances(allBalances.sorted.filter((b) => b.token?.symbol === symbol)),
    [allBalances.sorted, symbol]
  )

  if (!symbol) return <Navigate to="/portfolio" />

  return <PageContent balances={balances} symbol={symbol} />
}
