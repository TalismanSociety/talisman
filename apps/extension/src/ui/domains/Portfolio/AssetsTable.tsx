import { Balance, Balances } from "@core/types"
import { Box } from "@talisman/components/Box"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/hooks/useTokenBalancesSummary"
import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import StyledAssetLogo from "../Asset/Logo"
import { AssetBalanceCellValue } from "./AssetBalanceCellValue"
import { ChainLogoStack } from "./LogoStack"

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
}

export const AssetRow = ({ balances }: AssetRowProps) => {
  const { chainId, chainIds } = useMemo(() => {
    const { sorted } = balances
    const { chainId } = sorted[0]
    const chainIds = [
      ...new Set(sorted.filter((b) => b.total.planck > 0).map((b) => b.chainId)),
    ] as string[]
    return { chainId, chainIds }
  }, [balances])

  const { token, summary } = useTokenBalancesSummary(balances)

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
            <StyledAssetLogo id={chainId} />
          </Box>
          <Box grow flex column justify="center" gap={0.4}>
            <Box fontsize="normal" bold fg="foreground">
              {token.symbol}
            </Box>
            {chainIds?.length > 1 && (
              <div>
                <ChainLogoStack chainIds={chainIds} />
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

  // group by token (match by symbol + decimals + coingeckoId)
  // note : if 2 different tokens of this object have same symbol, there will be issues
  // but if we don't split them, it would break the token details page which only expects a symbol as prop
  const balancesByToken = useMemo(() => {
    const groupedByToken = balancesToDisplay.sorted.reduce((acc, b) => {
      if (!b.token) return acc
      const key = `${b.token.symbol}-${b.token.decimals}-${b.token.coingeckoId}`
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
          Object.entries(balancesByToken).map(([symbol, b]) => (
            <AssetRow key={symbol} balances={b} />
          ))}
      </tbody>
    </Table>
  )
}
