import { Balances } from "@core/domains/balances/types"
import { Box } from "@talisman/components/Box"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { DashboardAssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import React, { useCallback, useEffect, useMemo } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import styled from "styled-components"

const Stats = styled(Statistics)`
  max-width: 40%;
`

const BackButton = styled.button`
  color: var(--color-mid);
  outline: none;
  border: none;
  background: none;
  text-align: left;
  padding: 0;
  white-space: nowrap;
  display: flex;
  align-items: center;
  font-size: var(--font-size-small);
  cursor: pointer;

  svg {
    font-size: var(--font-size-normal);
  }

  :hover {
    color: var(--color-foreground-muted);
  }
`

// memoise to re-render only if balances object changes
const PageContent = React.memo(({ balances, symbol }: { balances: Balances; symbol: string }) => {
  const navigate = useNavigate()
  const balancesToDisplay = useDisplayBalances(balances)
  const { token, summary } = useTokenBalancesSummary(balancesToDisplay)

  const handleBackBtnClick = useCallback(() => navigate("/portfolio"), [navigate])

  return (
    <div>
      <Box flex fullwidth gap={1.6} h={9.6}>
        <Box grow flex column gap={1.6} justify="center">
          <BackButton type="button" onClick={handleBackBtnClick}>
            <ChevronLeftIcon />
            Asset
          </BackButton>
          <Box flex align="center" gap={0.8}>
            <Box fontsize="large">
              <TokenLogo tokenId={token?.id} />
            </Box>
            <Box fontsize="medium">{token?.symbol}</Box>
          </Box>
        </Box>
        <Stats
          title="Total Asset Value"
          tokens={summary.totalTokens}
          fiat={summary.totalFiat}
          token={token}
          showTokens
        />
        <Stats
          title="Locked"
          tokens={summary.lockedTokens}
          fiat={summary.lockedFiat}
          token={token}
          locked
          showTokens
        />
        <Stats
          title="Available"
          tokens={summary.availableTokens}
          fiat={summary.availableFiat}
          token={token}
          showTokens
        />
      </Box>
      <Box margin="4.8rem 0 0 0">
        <DashboardAssetDetails balances={balancesToDisplay} symbol={symbol} />
      </Box>
    </div>
  )
})

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
