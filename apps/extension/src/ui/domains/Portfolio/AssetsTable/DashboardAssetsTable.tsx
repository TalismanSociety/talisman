import { Balances } from "@core/domains/balances/types"
import { ExternalLinkIcon, XIcon, ZapIcon } from "@talisman/theme/icons"
import { useBalancesStatus } from "@talismn/balances-react"
import { classNames } from "@talismn/util"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { TokenLogo } from "../../Asset/TokenLogo"
import { AssetBalanceCellValue } from "../AssetBalanceCellValue"
import { useNomPoolStakingBanner } from "../NomPoolStakingContext"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { NetworksLogoStack } from "./NetworksLogoStack"
import { usePortfolioNetworkIds } from "./usePortfolioNetworkIds"
import { usePortfolioSymbolBalances } from "./usePortfolioSymbolBalances"

const Table = styled.table`
  border-collapse: collapse;
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

    td {
      padding: 0;
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
      border-bottom-left-radius: var(--border-radius);
    }
    > td:last-child {
      border-bottom-right-radius: var(--border-radius);
    }

    :not(.has-staking-banner) {
      > td:first-child {
        border-top-left-radius: var(--border-radius);
      }
      > td:last-child {
        border-top-right-radius: var(--border-radius);
      }
    }
  }

  .noPadRight {
    padding-right: 0;
  }
`

const AssetRowSkeleton = ({ className }: { className?: string }) => {
  return (
    <>
      <tr className={classNames("asset skeleton", className)}>
        <td>
          <div className="flex h-[6.6rem]">
            <div className="p-8 text-xl">
              <div className="bg-grey-700 h-16 w-16 animate-pulse rounded-full"></div>
            </div>
            <div className="flex grow flex-col justify-center gap-2">
              <div className="bg-grey-700 rounded-xs h-8 w-20 animate-pulse"></div>
            </div>
          </div>
        </td>
        <td></td>
        <td>
          <div className="flex h-full flex-col items-end justify-center gap-2 px-8">
            <div className="bg-grey-700 rounded-xs h-8 w-[10rem] animate-pulse"></div>
            <div className="bg-grey-700 rounded-xs h-8 w-[6rem] animate-pulse"></div>
          </div>
        </td>
      </tr>
      <tr className="spacer h-4">
        <td colSpan={3}></td>
      </tr>
    </>
  )
}

type AssetRowProps = {
  balances: Balances
}

const AssetRow = ({ balances }: AssetRowProps) => {
  const networkIds = usePortfolioNetworkIds(balances)
  const { genericEvent } = useAnalytics()

  const status = useBalancesStatus(balances)

  const { token, summary } = useTokenBalancesSummary(balances)
  const { showNomPoolBanner, dismissNomPoolBanner } = useNomPoolStakingBanner()
  const showBanner = showNomPoolBanner({
    chainId: token?.chain?.id,
    addresses: balances.sorted.map((b) => b.address),
  })

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    navigate(`/portfolio/${token?.symbol}`)
    genericEvent("goto portfolio asset", { from: "dashboard", symbol: token?.symbol })
  }, [genericEvent, navigate, token?.symbol])

  const handleClickStakingBanner = useCallback(() => {
    window.open("https://app.talisman.xyz/staking")
    genericEvent("open web app staking from banner", { from: "dashboard", symbol: token?.symbol })
  }, [genericEvent, token?.symbol])

  const handleDismissStakingBanner = useCallback(() => {
    dismissNomPoolBanner()
    genericEvent("dismiss staking banner", { from: "dashboard", symbol: token?.symbol })
  }, [genericEvent, dismissNomPoolBanner, token?.symbol])

  if (!token || !summary) return null

  return (
    <>
      {showBanner && (
        <tr className="staking-banner bg-primary-500 text-primary-500 h-[4.1rem] cursor-pointer bg-opacity-10 text-sm">
          <td colSpan={3} className="rounded-t px-8">
            <div className="flex w-full items-center justify-between">
              <div onClick={handleClickStakingBanner} className="flex items-center gap-4">
                <ZapIcon /> <span className="text-white">Earn ~15% yield on your DOT.</span> This
                balance is eligible for Nomination Pool Staking via the Talisman Portal.{" "}
                <ExternalLinkIcon />
              </div>
              <XIcon className="h-8" onClick={handleDismissStakingBanner} />
            </div>
          </td>
        </tr>
      )}
      <tr
        className={classNames(`asset${showBanner ? " has-staking-banner" : ""}`)}
        onClick={handleClick}
      >
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
            balancesStatus={status}
            className={classNames(
              "noPadRight",
              status.status === "fetching" && "animate-pulse transition-opacity"
            )}
          />
        </td>
        <td align="right" valign="top">
          <AssetBalanceCellValue
            render
            tokens={summary.availableTokens}
            fiat={summary.availableFiat}
            symbol={token.symbol}
            balancesStatus={status}
            className={classNames(
              status.status === "fetching" && "animate-pulse transition-opacity"
            )}
          />
        </td>
      </tr>
      <tr className="spacer h-4">
        <td colSpan={3}></td>
      </tr>
    </>
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
      return "opacity-80"
    case 2:
      return "opacity-60"
    case 3:
      return "opacity-40"
    case 4:
      return "opacity-30"
    case 5:
      return "opacity-20"
    case 6:
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
