import { Balances } from "@core/domains/balances/types"
import { Box } from "@talisman/components/Box"
import { Skeleton } from "@talisman/components/Skeleton"
import { LoaderIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { useAnalytics } from "@ui/hooks/useAnalytics"
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
  border-collapse: separate;
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

    td {
      background: var(--color-background-muted);
      .logo-stack .logo-circle {
        border-color: var(--color-background-muted);
      }
    }

    :not(.skeleton):hover td {
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
}

const FetchingIcon = styled(LoaderIcon)`
  line-height: 1;
  font-size: 1.8rem;
`

const AssetRow = ({ balances }: AssetRowProps) => {
  const networkIds = usePortfolioNetworkIds(balances)
  const { genericEvent } = useAnalytics()

  const isFetching = useMemo(
    () => balances.sorted.some((b) => b.status === "cache"),
    [balances.sorted]
  )

  const { token, summary } = useTokenBalancesSummary(balances)

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    navigate(`/portfolio/${token?.symbol}`)
    genericEvent("goto portfolio asset", { from: "dashboard", symbol: token?.symbol })
  }, [genericEvent, navigate, token?.symbol])

  if (!token || !summary) return null

  return (
    <tr className={classNames("asset")} onClick={handleClick}>
      <td valign="top">
        <div className="flex">
          <div className="p-8 text-xl">
            <TokenLogo tokenId={token.id} />
          </div>
          <div className="flex grow flex-col justify-center gap-2">
            <div className="text-body text-base font-bold">{token.symbol} </div>
            {!!networkIds.length && (
              <div>
                <NetworksLogoStack networkIds={networkIds} />
              </div>
            )}
          </div>
        </div>
      </td>
      <td align="right" valign="top">
        <AssetBalanceCellValue
          locked
          render={summary.lockedTokens.gt(0)}
          tokens={summary.lockedTokens}
          fiat={summary.lockedFiat}
          symbol={token.symbol}
          className={classNames("noPadRight", isFetching && "animate-pulse transition-opacity")}
        />
      </td>
      <td align="right" valign="top">
        <AssetBalanceCellValue
          render
          tokens={summary.availableTokens}
          fiat={summary.availableFiat}
          symbol={token.symbol}
          className={classNames(isFetching && "animate-pulse transition-opacity")}
        />
      </td>
    </tr>
  )
}

type AssetsTableProps = {
  balances: Balances
}

const getSkeletonOpacity = (index: number) => {
  // tailwind parses files to find classes that it should include in it's bundle
  // so we can't dynamically compute the className
  switch (index) {
    case 0:
      return "opacity-100"
    case 1:
      return "opacity-90"
    case 2:
      return "opacity-80"
    case 3:
      return "opacity-70"
    case 4:
      return "opacity-60"
    case 5:
      return "opacity-50"
    case 6:
      return "opacity-40"
    case 7:
      return "opacity-30"
    case 8:
      return "opacity-20"
    case 9:
      return "opacity-10"
    default:
      return "opacity-0"
  }
}

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
          <AssetRow key={symbol} balances={b} />
        ))}
        {[...Array(skeletons).keys()].map((i) => (
          <AssetRowSkeleton key={i} className={getSkeletonOpacity(i)} />
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
