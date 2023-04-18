import { Balances } from "@core/domains/balances/types"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { FadeIn } from "@talisman/components/FadeIn"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { ExternalLinkIcon, LockIcon, XIcon, ZapIcon } from "@talisman/theme/icons"
import { useBalancesStatus } from "@talismn/balances-react"
import { classNames } from "@talismn/util"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { ReactNode, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { TokenLogo } from "../../Asset/TokenLogo"
import { useNomPoolStakingBanner } from "../NomPoolStakingContext"
import { useSelectedAccount } from "../SelectedAccountContext"
import { StaleBalancesIcon } from "../StaleBalancesIcon"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { NetworksLogoStack } from "./NetworksLogoStack"
import { usePortfolioNetworkIds } from "./usePortfolioNetworkIds"
import { usePortfolioSymbolBalances } from "./usePortfolioSymbolBalances"

const getSkeletonOpacity = (index: number) => {
  // tailwind parses files to find classes that it should include
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

type AssetRowProps = {
  balances: Balances
  locked?: boolean
}

const AssetButton = styled.button`
  width: 100%;
  outline: none;
  border: none;
  display: flex;
  align-items: center;
  border-radius: var(--border-radius-tiny);
  height: 5.6rem;

  :not(.staking-banner) {
    padding: 0 0.2rem;
    background: var(--color-background-muted);
  }

  .logo-stack .logo-circle {
    border-color: var(--color-background-muted);
  }

  :not(.skeleton) {
    cursor: pointer;
  }

  :not(.skeleton, .staking-banner):hover {
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
    <div
      className={classNames(
        "bg-black-secondary flex h-28 items-center gap-6 rounded-sm px-6",
        className
      )}
    >
      <div className="bg-grey-700 h-16 w-16 animate-pulse rounded-full px-6 text-xl"></div>
      <div className="grow space-y-1">
        <div className="flex justify-between gap-1">
          <div className="bg-grey-700 rounded-xs h-7 w-20 animate-pulse"></div>
          <div className="bg-grey-700 rounded-xs h-7 w-[10rem] animate-pulse"></div>
        </div>
        <div className="flex justify-between gap-1">
          <div className="bg-grey-700 rounded-xs h-7 w-10 animate-pulse"></div>
          <div className="bg-grey-700 rounded-xs h-7 w-[6rem] animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

const AssetRow = ({ balances, locked }: AssetRowProps) => {
  const networkIds = usePortfolioNetworkIds(balances)
  const { genericEvent } = useAnalytics()

  const status = useBalancesStatus(balances)

  const { token, summary } = useTokenBalancesSummary(balances)
  const { showNomPoolBanner, dismissNomPoolBanner } = useNomPoolStakingBanner()
  const showBanner = showNomPoolBanner({
    chainId: token?.chain?.id,
    addresses: locked ? [] : balances.sorted.map((b) => b.address),
  })

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    navigate(`/portfolio/${token?.symbol}`)
    genericEvent("goto portfolio asset", { from: "popup", symbol: token?.symbol })
  }, [genericEvent, navigate, token?.symbol])

  const handleClickStakingBanner = useCallback(() => {
    window.open("https://app.talisman.xyz/staking")
    genericEvent("open web app staking from banner", { from: "popup", symbol: token?.symbol })
  }, [genericEvent, token?.symbol])

  const handleDismissStakingBanner = useCallback(() => {
    dismissNomPoolBanner()
    genericEvent("dismiss staking banner", { from: "popup", symbol: token?.symbol })
  }, [genericEvent, dismissNomPoolBanner, token?.symbol])

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
    <>
      <AssetButton className="asset" onClick={handleClick}>
        <div className="p-6 text-xl">
          <TokenLogo tokenId={token.id} />
        </div>
        <div className="relative flex grow gap-4 pr-6">
          <div className="relative grow">
            {/* we want content from this cell to be hidden if there are too many tokens to display on right cell */}
            <div className="absolute top-0 left-0 flex w-full flex-col gap-2 overflow-hidden text-left">
              <div className="text-body flex items-center gap-2 whitespace-nowrap text-sm font-bold">
                {token.symbol}
              </div>
              {!!networkIds.length && (
                <div className="text-base">
                  <NetworksLogoStack networkIds={networkIds} />
                </div>
              )}
            </div>
          </div>
          <div
            className={classNames(
              "flex flex-col gap-2 text-right",
              status.status === "fetching" && "animate-pulse transition-opacity"
            )}
          >
            <div
              className={classNames(
                "whitespace-nowrap text-sm font-bold",
                locked ? "text-body-secondary" : "text-white"
              )}
            >
              <Tokens amount={tokens} symbol={token?.symbol} isBalance />
              {locked ? <RowLockIcon className="lock inline align-baseline" /> : null}
              <StaleBalancesIcon
                className="alert ml-2 inline align-baseline text-xs"
                staleChains={status.status === "stale" ? status.staleChains : []}
              />
            </div>
            <div className="text-body-secondary leading-base text-xs">
              {fiat === null ? "-" : <Fiat currency="usd" amount={fiat} isBalance />}
            </div>
          </div>
        </div>
      </AssetButton>
      {showBanner && (
        <AssetButton className="staking-banner bg-primary-500 text-primary-500 flex items-center justify-between bg-opacity-10 p-[1rem]">
          <div onClick={handleClickStakingBanner} className="flex gap-2">
            <div className="self-center">
              <ZapIcon className="h-[2.6rem] w-[2.6rem]" />
            </div>
            <div className="flex flex-col justify-start gap-[0.2rem] text-start text-sm text-white">
              <span className="font-bold">You're eligible for {token?.symbol} staking!</span>
              <div className="inline-flex gap-1 text-xs">
                Earn ~15% yield on your {token?.symbol} on the
                <span className="text-primary-500 flex gap-1">
                  Portal <ExternalLinkIcon />
                </span>
              </div>
            </div>
          </div>
          <div className="self-start">
            <XIcon onClick={handleDismissStakingBanner} className="h-6" />
          </div>
        </AssetButton>
      )}
    </>
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
    <div className="flex flex-col gap-6">
      <div
        className={classNames("text-md flex cursor-pointer items-center gap-2", className)}
        onClick={toggle}
      >
        <div className="text-body grow">{label}</div>
        <div className="text-body-secondary overflow-hidden text-ellipsis whitespace-nowrap">
          <Fiat amount={fiatAmount} currency="usd" isBalance />
        </div>
        <div className="text-body-secondary flex flex-col justify-center text-lg">
          <AccordionIcon isOpen={isOpen} />
        </div>
      </div>
      <Accordion isOpen={isOpen}>
        <div className="flex flex-col gap-4">{children}</div>
      </Accordion>
    </div>
  )
}

export const PopupAssetsTable = ({ balances }: GroupedAssetsTableProps) => {
  const { account } = useSelectedAccount()
  // group by token (symbol)
  const { symbolBalances, skeletons } = usePortfolioSymbolBalances(balances)

  // split by status
  const { available, locked, totalAvailable, totalLocked } = useMemo(() => {
    const available = symbolBalances
      .map(([symbol, balances]): [string, Balances] => [
        symbol,
        balances.find((b) => b.total.planck === 0n || b.free.planck > 0n),
      ])
      .filter(([, balances]) => balances.count > 0)

    const locked = symbolBalances
      .map(([symbol, balances]): [string, Balances] => [
        symbol,
        balances.find((b) => b.frozen.planck > 0n || b.reserved.planck > 0n),
      ])
      .filter(([, balances]) => balances.count > 0)

    const { transferable, frozen, reserved } = balances.sum.fiat("usd")

    return { available, locked, totalAvailable: transferable, totalLocked: frozen + reserved }
  }, [balances, symbolBalances])

  if (!available.length && !locked.length) return null

  return (
    <FadeIn>
      <div>
        <BalancesGroup label="Available" fiatAmount={totalAvailable}>
          {available.map(([symbol, b]) => (
            <AssetRow key={symbol} balances={b} />
          ))}
          {[...Array(skeletons).keys()].map((i) => (
            <AssetRowSkeleton key={i} className={getSkeletonOpacity(i)} />
          ))}
          {!skeletons && !available.length && (
            <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
              There are no available balances{account ? " for this account" : ""}.
            </div>
          )}
          <div className="h-8" />
        </BalancesGroup>
        <BalancesGroup
          label={
            <div className="flex items-center gap-2">
              <div>Locked</div>
              <div>
                <SectionLockIcon />
              </div>
            </div>
          }
          fiatAmount={totalLocked}
        >
          {locked.map(([symbol, b]) => (
            <AssetRow key={symbol} balances={b} locked />
          ))}
          {!locked.length && (
            <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
              There are no locked balances{account ? " for this account" : ""}.
            </div>
          )}
        </BalancesGroup>
      </div>
    </FadeIn>
  )
}
