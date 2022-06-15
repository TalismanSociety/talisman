import { Balances } from "@core/types"
import { Box } from "@talisman/components/Box"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { AssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import useBalances from "@ui/hooks/useBalances"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/hooks/useTokenBalancesSummary"
import React, { useCallback, useMemo } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import styled from "styled-components"
import { useSelectedAccount } from "../../context"
import Layout from "../../layout"

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
const PageContent = React.memo(({ balances }: { balances: Balances }) => {
  const navigate = useNavigate()
  const balancesToDisplay = useDisplayBalances(balances)
  const { token, summary } = useTokenBalancesSummary(balancesToDisplay)

  const handleBackBtnClick = useCallback(() => navigate("/portfolio"), [navigate])

  return (
    <Layout centered large>
      {summary && !!token && (
        <>
          <Box flex fullwidth gap={1.6}>
            <Box grow flex column gap={1.6} justify="center">
              <BackButton type="button" onClick={handleBackBtnClick}>
                <ChevronLeftIcon />
                Asset
              </BackButton>
              <Box flex align="center" gap={0.8}>
                <Box fontsize="large">
                  <TokenLogo tokenId={token.id} />
                </Box>
                <Box fontsize="medium">{token.symbol}</Box>
              </Box>
            </Box>
            <Stats
              title="Total Asset Value"
              tokens={summary.totalTokens}
              fiat={summary.totalFiat}
              token={token}
            />
            <Stats
              title="Locked"
              tokens={summary.lockedTokens}
              fiat={summary.lockedFiat}
              token={token}
              locked
            />
            <Stats
              title="Available"
              tokens={summary.availableTokens}
              fiat={summary.availableFiat}
              token={token}
            />
          </Box>
          <Box margin="4.8rem 0 0 0">
            <AssetDetails balances={balancesToDisplay} />
          </Box>
        </>
      )}
    </Layout>
  )
})

const SingleAccountAssetsTable = ({ address, symbol }: { address: string; symbol: string }) => {
  const allBalances = useBalancesByAddress(address)

  const balances = useMemo(
    () => new Balances(allBalances.sorted.filter((b) => b.token?.symbol === symbol)),
    [allBalances.sorted, symbol]
  )

  return <PageContent balances={balances} />
}

const AllAccountsAssetsTable = ({ symbol }: { symbol: string }) => {
  const allBalances = useBalances()

  const balances = useMemo(
    () => new Balances(allBalances.sorted.filter((b) => b.token?.symbol === symbol)),
    [allBalances.sorted, symbol]
  )

  return <PageContent balances={balances} />
}

export const PortfolioAsset = () => {
  const routerParams = useParams()
  const { account } = useSelectedAccount()

  const { symbol } = routerParams

  if (!symbol) return <Navigate to="/portfolio" />

  return account ? (
    <SingleAccountAssetsTable address={account.address} symbol={symbol} />
  ) : (
    <AllAccountsAssetsTable symbol={symbol} />
  )
}
