import { Balances } from "@core/domains/balances/types"
import { planckToTokens } from "@core/util"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { Box } from "@talisman/components/Box"
import { FadeIn } from "@talisman/components/FadeIn"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { LoaderIcon, LockIcon } from "@talisman/theme/icons"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { useTokenBalancesSummary } from "@ui/hooks/useTokenBalancesSummary"
import { ReactNode, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { TokenLogo } from "../../Asset/TokenLogo"
import { usePortfolio } from "../context"
import { ChainLogoStack } from "../LogoStack"
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

type GroupProps = {
  label: ReactNode
  fiatAmount: number
  className?: string
  children?: ReactNode
}

const BalancesGroup = ({ label, fiatAmount, className, children }: GroupProps) => {
  const { isOpen, toggle } = useOpenClose(true)

  return (
    <Box flex column gap={1.2} onClick={toggle}>
      <Box className={className} flex fontsize="medium" gap={0.4} align="center" pointer>
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

// TODO also have acounts and network filter as props ?
export const PopupAssetsTable = ({ balances }: GroupedAssetsTableProps) => {
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

  if (!available.length && !locked.length) return null

  return (
    <FadeIn>
      <Box flex column gap={0.8}>
        {available.length > 0 && (
          <BalancesGroup label="Available" fiatAmount={totalAvailable}>
            {available.map(([symbol, b]) => (
              <AssetRow key={symbol} balances={b} symbol={symbol} />
            ))}
          </BalancesGroup>
        )}
        {locked.length > 0 && (
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
          </BalancesGroup>
        )}
      </Box>
    </FadeIn>
  )
}
