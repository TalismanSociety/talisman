import { Balances } from "@core/types"
import { Box } from "@talisman/components/Box"
import { FadeIn } from "@talisman/components/FadeIn"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { AssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { NetworkPicker } from "@ui/domains/Portfolio/NetworkPicker"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/hooks/useTokenBalancesSummary"
import React, { useCallback, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import styled from "styled-components"
import { usePortfolio } from "@ui/domains/Portfolio/context"

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
  const { token, summary } = useTokenBalancesSummary(balancesToDisplay, symbol)

  const handleBackBtnClick = useCallback(() => navigate("/portfolio"), [navigate])

  return (
    <div>
      <Box flex fullwidth gap={1.6} height={9.6}>
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
      <Box margin="3.8rem 0 0 0">
        <NetworkPicker />
      </Box>
      <Box margin="4.8rem 0 0 0">
        <AssetDetails balances={balancesToDisplay} symbol={symbol} />
      </Box>
    </div>
  )
})

export const PortfolioAsset = () => {
  const { symbol } = useParams()
  const { balances: allBalances } = usePortfolio()

  const balances = useMemo(
    () => new Balances(allBalances.sorted.filter((b) => b.token?.symbol === symbol)),
    [allBalances.sorted, symbol]
  )

  return <PageContent balances={balances} symbol={symbol!} />
}
