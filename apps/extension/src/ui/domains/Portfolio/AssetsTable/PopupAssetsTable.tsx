import { Balances } from "@core/domains/balances/types"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { Box } from "@talisman/components/Box"
import { FadeIn } from "@talisman/components/FadeIn"
import { Skeleton } from "@talisman/components/Skeleton"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { LoaderIcon, LockIcon } from "@talisman/theme/icons"
import { planckToTokens } from "@talismn/util"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { ReactNode, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { TokenLogo } from "../../Asset/TokenLogo"
import { useSelectedAccount } from "../SelectedAccountContext"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { NetworksLogoStack } from "./NetworksLogoStack"
import { usePortfolioNetworkIds } from "./usePortfolioNetworkIds"
import { usePortfolioSymbolBalances } from "./usePortfolioSymbolBalances"

type AssetRowProps = {
  balances: Balances
  symbol: string
  locked?: boolean
}

const FetchingIcon = styled(LoaderIcon)`
  line-height: 1.2rem;
  font-size: 1.2rem;
`

const Container = styled(Box)`
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

const AssetButton = styled.button`
  width: 100%;
  outline: none;
  border: none;
  display: flex;
  align-items: center;
  border-radius: var(--border-radius-tiny);
  height: 5.6rem;
  padding: 0 0.2rem;

  background: var(--color-background-muted);
  .logo-stack .logo-circle {
    border-color: var(--color-background-muted);
  }

  :not(.skeleton) {
    cursor: pointer;
  }

  :not(.skeleton):hover {
    background: var(--color-background-muted-3x);
    .logo-stack .logo-circle {
      border-color: var(--color-background-muted-3x);
    }
  }
`

const RowLockIcon = styled(LockIcon)`
  font-size: 1.2rem;
  margin-left: 0.4rem;
`
const SectionLockIcon = styled(LockIcon)`
  font-size: 1.4rem;
`

const AssetRowSkeleton = ({ className }: { className?: string }) => {
  return (
    <Box
      fullwidth
      flex
      align="center"
      bg="background-muted"
      borderradius="tiny"
      className={className}
      padding={"0 0.2rem"}
      h={5.6}
    >
      <Box padding="1.2rem" fontsize="xlarge" w={5.6}>
        <Skeleton
          baseColor="#5A5A5A"
          highlightColor="#A5A5A5"
          width={"3.2rem"}
          height={"3.2rem"}
          circle
        />
      </Box>
      <Box
        grow
        flex
        column
        justify="center"
        gap={0.4}
        lineheight="small"
        fontsize="small"
        padding="0 1.2rem 0 0"
      >
        <Box bold fg="foreground" flex justify="space-between">
          <Box fontsize="small">
            <Skeleton
              baseColor="#5A5A5A"
              highlightColor="#A5A5A5"
              width={"4rem"}
              height={"1.4rem"}
            />
          </Box>
          <Box fontsize="normal">
            <Skeleton
              baseColor="#5A5A5A"
              highlightColor="#A5A5A5"
              width={"10rem"}
              height={"1.4rem"}
            />
          </Box>
        </Box>
        <Box flex justify="space-between" lineheight="small">
          <Box fontsize="normal">
            <Skeleton
              baseColor="#5A5A5A"
              highlightColor="#A5A5A5"
              width={"2rem"}
              height={"1.4rem"}
            />
          </Box>
          <Box fg="mid" fontsize="xsmall">
            <Skeleton
              baseColor="#5A5A5A"
              highlightColor="#A5A5A5"
              width={"6rem"}
              height={"1.4rem"}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

const AssetRow = ({ balances, symbol, locked }: AssetRowProps) => {
  const networkIds = usePortfolioNetworkIds(balances)
  const { genericEvent } = useAnalytics()

  const isFetching = useMemo(
    () => balances.sorted.some((b) => b.status === "cache"),
    [balances.sorted]
  )

  const { token, summary } = useTokenBalancesSummary(balances, symbol)

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    navigate(`/portfolio/${token?.symbol}`)
    genericEvent("goto portfolio asset", { from: "popup", symbol: token?.symbol })
  }, [genericEvent, navigate, token?.symbol])

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
      <Box grow relative flex padding="0 1.2rem 0 0" gap={0.8}>
        <Box relative grow>
          {/* we want content from this cell to be hidden if there are too many tokens to display on right cell */}
          <Box
            flex
            column
            textalign="left"
            gap={0.4}
            absolute
            top={0}
            left={0}
            overflow="hidden"
            w="100%"
            h="100%"
          >
            <Box fontsize="small" fg="foreground" bold noWrap>
              {token.symbol}
              {isFetching && (
                <span>
                  {" "}
                  <FetchingIcon data-spin />
                </span>
              )}
            </Box>
            {!!networkIds.length && (
              <Box fontsize="normal">
                <NetworksLogoStack networkIds={networkIds} />
              </Box>
            )}
          </Box>
        </Box>
        <Box flex column textalign="right" gap={0.4}>
          <Box fontsize="small" fg={locked ? "mid" : "foreground"} bold noWrap>
            <Tokens
              amount={planckToTokens(tokens.toString(), token.decimals)}
              symbol={token?.symbol}
              isBalance
            />
            {locked ? <RowLockIcon className="lock" /> : null}
          </Box>
          <Box fg="mid" fontsize="xsmall" lineheight="normal">
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

type GroupProps = {
  label: ReactNode
  fiatAmount: number
  className?: string
  children?: ReactNode
}

const BalancesGroup = ({ label, fiatAmount, className, children }: GroupProps) => {
  const { isOpen, toggle } = useOpenClose(true)

  return (
    <Box flex column gap={1.2}>
      <Box
        className={className}
        onClick={toggle}
        flex
        fontsize="medium"
        gap={0.4}
        align="center"
        pointer
      >
        <Box fg="foreground" grow>
          {label}
        </Box>
        <Box fg="mid" overflow="hidden" textOverflow="ellipsis" noWrap>
          <Fiat amount={fiatAmount} currency="usd" isBalance />
        </Box>
        <Box flex column justify="center" fontsizecustom="2.4rem" fg="mid">
          <AccordionIcon isOpen={isOpen} />
        </Box>
      </Box>
      <Accordion isOpen={isOpen}>
        <Box flex column gap={0.8}>
          {children}
        </Box>
      </Accordion>
    </Box>
  )
}

export const PopupAssetsTable = ({ balances }: GroupedAssetsTableProps) => {
  const { account } = useSelectedAccount()
  // group by token (symbol)
  const { symbolBalances, skeletons } = usePortfolioSymbolBalances(balances)

  // split by status
  const { available, locked, totalAvailable, totalLocked } = useMemo(() => {
    const available = symbolBalances
      .map<[string, Balances]>(([symbol, balance]) => [
        symbol,
        new Balances(
          balance.sorted.filter((b) => b.total.planck === BigInt(0) || b.free.planck > BigInt(0))
        ),
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

  if (!available.length && !locked.length) return null

  return (
    <FadeIn>
      <Container>
        <BalancesGroup label="Available" fiatAmount={totalAvailable}>
          {available.map(([symbol, b]) => (
            <AssetRow key={symbol} balances={b} symbol={symbol} />
          ))}
          {[...Array(skeletons).keys()].map((i) => (
            <AssetRowSkeleton key={i} className={`opacity-${i}`} />
          ))}
          {!skeletons && !available.length && (
            <Box
              bg="background-muted"
              fg="mid"
              padding={2}
              borderradius="tiny"
              fontsize="xsmall"
              textalign="center"
            >
              There are no available balances{account ? " for this account" : ""}.
            </Box>
          )}
          <Box h={1.6} />
        </BalancesGroup>
        <BalancesGroup
          label={
            <span>
              Locked <SectionLockIcon />
            </span>
          }
          fiatAmount={totalLocked}
        >
          {locked.map(([symbol, b]) => (
            <AssetRow key={symbol} balances={b} symbol={symbol} locked />
          ))}
          {!locked.length && (
            <Box
              bg="background-muted"
              fg="mid"
              padding={2}
              borderradius="tiny"
              fontsize="xsmall"
              textalign="center"
            >
              There are no locked balances{account ? " for this account" : ""}.
            </Box>
          )}
        </BalancesGroup>
      </Container>
    </FadeIn>
  )
}
