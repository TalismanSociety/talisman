import { Balance, Balances } from "@core/types"
import { rectToClientRect } from "@floating-ui/core"
import { Box } from "@talisman/components/Box"
import { FadeIn } from "@talisman/components/FadeIn"
import { classNames } from "@talisman/util/classNames"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/hooks/useTokenBalancesSummary"
import { useCallback, useEffect, useMemo, useState } from "react"
import Skeleton from "react-loading-skeleton"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import { TokenLogo } from "../Asset/TokenLogo"
import { AssetBalanceCellValue } from "./AssetBalanceCellValue"
import { usePortfolio } from "./context"
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
    :not(.skeleton) {
      cursor: pointer;
    }
    background: var(--color-background-muted);
    :not(.skeleton):hover {
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

    &.fetching {
      background: linear-gradient(
          to right,
          rgba(var(--color-mid-raw), 0),
          rgba(var(--color-mid-raw), 0.1) 70%,
          rgba(var(--color-mid-raw), 0) 100%
        ),
        var(--color-background-muted);
      background-repeat: repeat-y;
      background-size: 20% 500px;
      background-position: 0 0;
      animation: bg-slide-x 2.5s infinite;
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
        <Box flex opacity={0.3}>
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
          height={6.6}
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

export const AssetRow = ({ balances, symbol }: AssetRowProps) => {
  const { chains, evmNetworks } = usePortfolio()
  const { logoIds } = useMemo(() => {
    const chainIds = [
      ...new Set(
        balances.sorted
          .filter((b) => b.total.planck > 0)
          .map((b) => b.chain?.id ?? b.evmNetwork?.id)
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
  }, [balances.sorted, chains, evmNetworks])

  const [isFetching, setIsFetching] = useState(false)
  useEffect(() => {
    // if fetching, set it after a random delay between 0 and 500, otherwise all row skeletion effet would be synchronized which looks bad
    if (balances.sorted.some((b) => b.status === "cache")) {
      const timeout = setTimeout(() => {
        setIsFetching(true)
      }, Math.floor(Math.random() * 2000)) // between 0 and 500ms
      return () => {
        clearTimeout(timeout)
      }
    } else {
      setIsFetching(false)
      return () => {}
    }
  }, [balances.count, balances.sorted, symbol])

  const { token, summary } = useTokenBalancesSummary(balances, symbol)

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    navigate(`/portfolio/${token?.symbol}`)
  }, [navigate, token?.symbol])

  if (!token || !summary) return null

  return (
    <tr className={classNames("asset", isFetching && "fetching")} onClick={handleClick}>
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
  // if (rows.length === 0) return null

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
        {rows?.length ? (
          rows.map(([symbol, b]) => <AssetRow key={symbol} balances={b} symbol={symbol} />)
        ) : (
          <>
            <AssetRowSkeleton />
            <AssetRowSkeleton className="opacity-1" />
            <AssetRowSkeleton className="opacity-2" />
            <AssetRowSkeleton className="opacity-3" />
          </>
        )}
      </tbody>
    </Table>
  )
}
