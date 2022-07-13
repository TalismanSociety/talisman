import { Balance, Balances } from "@core/domains/balances/types"
import { planckToTokens } from "@core/util"
import { Box } from "@talisman/components/Box"
import { LoaderIcon, LockIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { useTokenBalancesSummary } from "@ui/hooks/useTokenBalancesSummary"
import { ReactNode, useCallback, useMemo } from "react"
import Skeleton from "react-loading-skeleton"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { TokenLogo } from "../../Asset/TokenLogo"
import { AssetBalanceCellValue } from "../AssetBalanceCellValue"
import { usePortfolio } from "../context"
import { ChainLogoStack } from "../LogoStack"
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
        <Box height={6.6} flex opacity={0.3}>
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

type RowType = "available" | "locked"

type AssetRowProps = {
  balances: Balances
  symbol: string
  locked?: boolean
}

const FetchingIcon = styled(LoaderIcon)`
  line-height: 1.2rem;
  font-size: 1.2rem;
`

const AssetButton = styled.button`
  width: 100%;
  outline: none;
  border: none;
  display: flex;
  align-items: center;
  border-radius: var(--border-radius);

  :not(.skeleton) {
    cursor: pointer;
  }
  background: var(--color-background-muted);
  :not(.skeleton):hover {
    background: var(--color-background-muted-3x);
  }
`

const RowLockIcon = styled(LockIcon)`
  font-size: 1.2rem;
  margin-left: 0.4rem;
`
const SectionLockIcon = styled(LockIcon)`
  font-size: 1.4rem;
`

const AssetRow = ({ balances, symbol, locked }: AssetRowProps) => {
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

  const isFetching = useMemo(
    () => balances.sorted.some((b) => b.status === "cache"),
    [balances.sorted]
  )

  const { token, summary } = useTokenBalancesSummary(balances, symbol)

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    navigate(`/portfolio/${token?.symbol}`)
  }, [navigate, token?.symbol])

  const { tokens, fiat } = useMemo(() => {
    return {
      tokens: locked ? summary.lockedTokens : summary.availableTokens,
      fiat: locked ? summary.lockedFiat : summary.availableFiat,
    }
  }, [
    locked,
    summary.availableFiat,
    summary.availableTokens,
    summary.lockedFiat,
    summary.lockedTokens,
  ])

  if (!token || !summary) return null

  return (
    <AssetButton className="asset" onClick={handleClick}>
      <Box padding="1.2rem" fontsize="xlarge">
        <TokenLogo tokenId={token.id} />
      </Box>
      <Box
        grow
        flex
        column
        justify="center"
        gap={0.6}
        lineheight="small"
        fontsize="small"
        padding="0 1.2rem 0 0"
      >
        <Box bold fg="foreground" flex justify="space-between">
          <Box fontsize="small">
            {token.symbol}
            {isFetching && (
              <span>
                {" "}
                <FetchingIcon data-spin />
              </span>
            )}
          </Box>
          <Box fontsize="small" fg={locked ? "mid" : "foreground"}>
            <Tokens
              amount={planckToTokens(tokens.toString(), token.decimals)}
              symbol={token?.symbol}
              isBalance
            />
            {locked ? <RowLockIcon className="lock" /> : null}
          </Box>
        </Box>
        <Box fontsize="xsmall" flex justify="space-between">
          <Box>
            <ChainLogoStack chainIds={logoIds} />
          </Box>
          <Box fg="mid">
            {fiat === null ? "-" : <Fiat currency="usd" amount={fiat} isBalance />}
          </Box>
        </Box>
      </Box>
    </AssetButton>
  )
}

type GroupedAssetsTableProps = {
  balances: Balances
}

type GroupRowProps = {
  label: ReactNode
  fiatAmount: number
  className?: string
}

const GroupRow = ({ label, fiatAmount, className }: GroupRowProps) => {
  return (
    <Box className={className} flex justify="space-between" fontsize="medium">
      <Box fg="foreground">{label}</Box>
      <Box fg="mid">
        <Fiat amount={fiatAmount} currency="usd" isBalance />
      </Box>
    </Box>
  )
}

// TODO also have acounts and network filter as props ?
export const GroupedAssetsTable = ({ balances }: GroupedAssetsTableProps) => {
  // group by token (symbol)
  const { symbolBalances, skeletons } = usePortfolioSymbolBalances(balances)

  // split by status
  const { available, locked, totalAvailable, totalLocked } = useMemo(() => {
    const available = symbolBalances
      .map<[string, Balances]>(([symbol, balance]) => [
        symbol,
        new Balances(balance.sorted.filter((b) => b.free.planck > BigInt(0))),
      ])
      .filter(([, b]) => b.sorted.length > 0)
    const locked = symbolBalances
      .map<[string, Balances]>(([symbol, balance]) => [
        symbol,
        new Balances(
          balance.sorted.filter((b) => b.frozen.planck > BigInt(0) || b.reserved.planck > BigInt(0))
        ),
      ])
      .filter(([, b]) => b.sorted.length > 0)

    const { reserved, frozen, transferable } = balances.sum.fiat("usd")

    return { available, locked, totalAvailable: transferable, totalLocked: frozen + reserved }
  }, [balances, symbolBalances])

  return (
    <Box flex column gap={1.2}>
      {available.length > 0 && (
        <>
          <GroupRow label="Available" fiatAmount={totalAvailable} />
          {available.map(([symbol, b]) => (
            <AssetRow key={symbol} balances={b} symbol={symbol} />
          ))}
          {[...Array(skeletons).keys()].map((i) => (
            <AssetRowSkeleton key={i} className={`opacity-${i}`} />
          ))}
        </>
      )}
      {locked.length > 0 && (
        <>
          <Box height={1.2}></Box>
          <GroupRow
            label={
              <span>
                Locked <SectionLockIcon />
              </span>
            }
            fiatAmount={totalLocked}
          />
          {locked.map(([symbol, b]) => (
            <AssetRow key={symbol} balances={b} symbol={symbol} locked />
          ))}
        </>
      )}
    </Box>
  )
}
