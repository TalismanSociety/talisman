import { Balance, Balances } from "@core/types"
import { Box } from "@talisman/components/Box"
import { FadeIn } from "@talisman/components/FadeIn"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/hooks/useTokenBalancesSummary"
import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import { TokenLogo } from "../Asset/TokenLogo"
import { AssetBalanceCellValue } from "./AssetBalanceCellValue"
import { usePortfolio } from "./context"
import { ChainLogoStack } from "./LogoStack"
import { NoTokensMessage } from "./NoTokensMessage"

const Table = styled.table`
  border-spacing: 0 0.8rem;
  width: 100%;
  color: var(--color-mid);
  text-align: left;
  font-weight: 400;
  font-size: 1.6rem;

  th {
    font-size: 1.4rem;
    font-weight: 400;
    padding-bottom: 1rem;
  }

  tbody tr.asset {
    cursor: pointer;
    background: var(--color-background-muted);
    :hover {
      background: var(--color-background-muted-3x);
    }

    > td:first-child {
      border-top-left-radius: var(--border-radius);
      border-bottom-left-radius: var(--border-radius);
    }
    > td:last-child {
      border-top-right-radius: var(--border-radius);
      border-bottom-right-radius: var(--border-radius);
    }
  }

  .noPadRight {
    padding-right: 0;
  }
`

type AssetRowProps = {
  balances: Balances
  symbol: string
}

export const AssetRow = ({ balances, symbol }: AssetRowProps) => {
  const { chains, evmNetworks } = usePortfolio()
  const { logoIds } = useMemo(() => {
    const { sorted } = balances
    const chainIds = [
      ...new Set(
        sorted.filter((b) => b.total.planck > 0).map((b) => b.chain?.id ?? b.evmNetwork?.id)
      ),
    ]
    const logoIds = chainIds
      .map((id) => {
        const chain = chains?.find((c) => c.id === id)
        if (chain) return chain.id
        const evmNetwork = evmNetworks?.find((n) => n.id === id)
        if (evmNetwork) return evmNetwork.substrateChain?.id ?? evmNetwork.id
        return undefined
      })
      .filter((id) => id !== undefined) as string[]
    return { chainIds, logoIds }
  }, [balances, chains, evmNetworks])

  const { token, summary } = useTokenBalancesSummary(balances, symbol)

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    navigate(`/portfolio/${token?.symbol}`)
  }, [navigate, token?.symbol])

  if (!token || !summary) return null

  return (
    <tr className="asset" onClick={handleClick}>
      <td valign="top">
        <Box flex>
          <Box padding="1.6rem" fontsize="xlarge">
            <TokenLogo tokenId={token.id} />
          </Box>
          <Box grow flex column justify="center" gap={0.4}>
            <Box fontsize="normal" bold fg="foreground">
              {token.symbol}
            </Box>
            {logoIds?.length > 1 && (
              <div>
                <ChainLogoStack chainIds={logoIds} />
              </div>
            )}
          </Box>
        </Box>
      </td>
      <td align="right" valign="top">
        <AssetBalanceCellValue
          locked
          render={summary.lockedTokens > 0}
          planck={summary.lockedTokens}
          fiat={summary.lockedFiat}
          token={token}
          className="noPadRight"
        />
      </td>
      <td align="right" valign="top">
        <AssetBalanceCellValue
          render
          planck={summary.availableTokens}
          fiat={summary.availableFiat}
          token={token}
        />
      </td>
    </tr>
  )
}

type AssetsTableProps = {
  balances: Balances
}

export const AssetsTable = ({ balances }: AssetsTableProps) => {
  const balancesToDisplay = useDisplayBalances(balances)

  // group by token (symbol)
  const balancesByToken = useMemo(() => {
    const groupedByToken = balancesToDisplay.sorted.reduce((acc, b) => {
      if (!b.token) return acc
      const key = b.token.symbol
      if (acc[key]) acc[key].push(b)
      else acc[key] = [b]
      return acc
    }, {} as Record<string, Balance[]>)
    return Object.entries(groupedByToken).reduce(
      (acc, [key, balances]) => ({
        ...acc,
        [key]: new Balances(balances),
      }),
      {} as Record<string, Balances>
    )
  }, [balancesToDisplay.sorted])

  // wait for dictionnary to be populated to avoir column header flickering
  // (it will always contain ksm/dot or glmr/movr, but is empty on very first render)
  const rows = Object.entries(balancesByToken)
  if (rows.length === 0) return null

  return (
    <Table>
      <thead>
        <tr>
          <th>Asset</th>
          <th align="right">Locked</th>
          <th align="right">Available</th>
        </tr>
      </thead>
      <tbody>
        {balancesByToken &&
          rows.map(([symbol, b]) => <AssetRow key={symbol} balances={b} symbol={symbol} />)}
      </tbody>
    </Table>
  )
}
