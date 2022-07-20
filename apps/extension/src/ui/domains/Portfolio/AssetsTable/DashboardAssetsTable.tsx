import { Balances } from "@core/domains/balances/types"
import { Box } from "@talisman/components/Box"
import { Skeleton } from "@talisman/components/Skeleton"
import { LoaderIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { TokenLogo } from "../../Asset/TokenLogo"
import { AssetBalanceCellValue } from "../AssetBalanceCellValue"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { NetworksLogoStack } from "./NetworksLogoStack"
import { usePortfolioNetworkIds } from "./usePortfolioNetworkIds"
import { usePortfolioSymbolBalances } from "./usePortfolioSymbolBalances"

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
  td {
    padding: 0;
  }

  tbody tr.asset {
    :not(.skeleton) {
      cursor: pointer;
    }

    background: var(--color-background-muted);
    .logo-stack .logo-circle {
      border-color: var(--color-background-muted);
    }

    :not(.skeleton):hover {
      background: var(--color-background-muted-3x);
      .logo-stack .logo-circle {
        border-color: var(--color-background-muted-3x);
      }
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
  .opacity-1 {
    opacity: 0.8;
  }
  .opacity-2 {
    opacity: 0.6;
  }
  .opacity-3 {
    opacity: 0.4;
  }
`

const AssetRowSkeleton = ({ className }: { className?: string }) => {
  return (
    <tr className={classNames("asset skeleton", className)}>
      <td valign="top">
        <Box h={6.6} flex opacity={0.3}>
          <Box padding="1.6rem" fontsize="xlarge">
            <Skeleton
              baseColor="#5A5A5A"
              highlightColor="#A5A5A5"
              width={"3.2rem"}
              height={"3.2rem"}
              circle
            />
          </Box>
          <Box grow flex column justify="center" gap={0.4}>
            <Box fontsize="normal" bold fg="foreground">
              <Skeleton
                baseColor="#5A5A5A"
                highlightColor="#A5A5A5"
                width={"4rem"}
                height={"1.6rem"}
              />
            </Box>
          </Box>
        </Box>
      </td>
      <td valign="top"></td>
      <td valign="top">
        <Box
          flex
          opacity={0.3}
          h={6.6}
          column
          justify="center"
          gap={0.4}
          textalign="right"
          padding="1.6rem"
        >
          <Box fg="foreground">
            <Skeleton
              baseColor="#5A5A5A"
              highlightColor="#A5A5A5"
              width={"10rem"}
              height={"1.6rem"}
            />
          </Box>
          <div>
            <Skeleton
              baseColor="#5A5A5A"
              highlightColor="#A5A5A5"
              width={"6rem"}
              height={"1.6rem"}
            />
          </div>
        </Box>
      </td>
    </tr>
  )
}

type AssetRowProps = {
  balances: Balances
  symbol: string
}

const FetchingIcon = styled(LoaderIcon)`
  line-height: 1;
  font-size: 2rem;
`

const AssetRow = ({ balances, symbol }: AssetRowProps) => {
  const networkIds = usePortfolioNetworkIds(balances)

  const isFetching = useMemo(
    () => balances.sorted.some((b) => b.status === "cache"),
    [balances.sorted]
  )

  const { token, summary } = useTokenBalancesSummary(balances, symbol)

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    navigate(`/portfolio/${token?.symbol}`)
  }, [navigate, token?.symbol])

  if (!token || !summary) return null

  return (
    <tr className={classNames("asset")} onClick={handleClick}>
      <td valign="top">
        <Box flex>
          <Box padding="1.6rem" fontsize="xlarge">
            <TokenLogo tokenId={token.id} />
          </Box>
          <Box grow flex column justify="center" gap={0.4}>
            <Box fontsize="normal" bold fg="foreground" flex inline align="center" gap={0.6}>
              {token.symbol} {isFetching && <FetchingIcon data-spin />}
            </Box>
            {!!networkIds.length && (
              <div>
                <NetworksLogoStack networkIds={networkIds} />
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

// TODO also have acounts and network filter as props ?
export const DashboardAssetsTable = ({ balances }: AssetsTableProps) => {
  // group by token (symbol)
  const { symbolBalances, skeletons } = usePortfolioSymbolBalances(balances)

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
        {symbolBalances.map(([symbol, b]) => (
          <AssetRow key={symbol} balances={b} symbol={symbol} />
        ))}
        {[...Array(skeletons).keys()].map((i) => (
          <AssetRowSkeleton key={i} className={`opacity-${i}`} />
        ))}
        {/** this row locks column sizes to prevent flickering */}
        <tr>
          <td></td>
          <td width="30%"></td>
          <td width="30%"></td>
        </tr>
      </tbody>
    </Table>
  )
}
