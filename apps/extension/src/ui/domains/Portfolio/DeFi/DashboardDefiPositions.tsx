import { FadeIn } from "@talisman/components/FadeIn"
import { classNames, type Loadable, type LoadableStatus } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { currencyConfig } from "@ui/domains/Asset/currencyConfig"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useToggleCurrency } from "@ui/hooks/useToggleCurrency"
import {
  useDefiPositionsDisplay,
  usePortfolioSelectedAccounts,
  useSelectedCurrency,
} from "@ui/state"
import type { DefiPosition } from "extension-core"
import { type FC, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { PortfolioAccount } from "../AssetDetails/PortfolioAccount"
import { usePortfolioNavigation } from "../usePortfolioNavigation"
import { PositionSymbol } from "./PositionSymbol"
import { PositionTotal } from "./PositionTotal"
import { PositionType } from "./PositionType"

export const DashboardDefiPositions = () => {
  const positions = useDefiPositionsDisplay()

  if (!positions.data?.length && positions.status !== "loading") return <NoDefiPositionFound />

  return <DefiPositions />
}

const DefiPositions = () => {
  const positions = useDefiPositionsDisplay()

  return (
    <div className="flex w-full flex-col gap-4 overflow-hidden">
      {!!positions.data && <TotalRow positions={positions.data} />}
      <VirtualizedRows positions={positions} />
    </div>
  )
}

const VirtualizedRows: FC<{ positions: Loadable<DefiPosition[]> }> = ({ positions }) => {
  const ref = useRef<HTMLDivElement>(null)

  const [noCountUp, setNoCountUp] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => {
      // we only want count up on the first rendering of the table
      // ex: sorting or filtering rows using search box should not trigger count up
      setNoCountUp(true)
    }, 500)

    return () => clearTimeout(timeout)
  }, [])

  const rows = useMemo(
    () =>
      (positions.data ?? []).concat(
        ...(positions.status === "loading" ? [{ id: "SHIMMER" } as DefiPosition] : [])
      ),
    [positions]
  )

  const virtualizer = useVirtualizer({
    count: rows.length,
    overscan: 5,
    gap: 8,
    estimateSize: () => 66,
    getScrollElement: () => document.getElementById("main"),
  })

  return (
    <div ref={ref}>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            className="absolute top-0 left-0 h-28 w-full"
            style={{
              transform: `translateY(${item.start}px)`,
            }}
          >
            {!!rows[item.index] && (
              <DefiPositionRow
                key={rows[item.index].id}
                position={rows[item.index]}
                status={positions.status}
                noCountUp={noCountUp}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const TotalRow: FC<{ positions: DefiPosition[] }> = ({ positions }) => {
  const { t } = useTranslation()

  const totalValue = useMemo(
    () =>
      positions.reduce(
        (total, position) =>
          total + position.breakdown.reduce((sum, item) => sum + item.valueUsd, 0),
        0
      ),
    [positions]
  )

  if (!positions.length) return null

  return (
    <div className="flex h-40 w-full items-center justify-between rounded bg-grey-850 px-8 text-body-secondary text-sm">
      <div className="flex flex-col gap-4">
        <div className="text-sm">{t("Total Value")}</div>
        <div className="flex items-center gap-2 text-base text-white">
          <ToggleCurrency />
          <FiatFromUsd amount={totalValue} isBalance currencyDisplay="code" />
        </div>
      </div>
    </div>
  )
}

const ToggleCurrency = () => {
  const currency = useSelectedCurrency()
  const toggleCurrency = useToggleCurrency()

  return (
    <button
      className={classNames(
        "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-grey-750 bg-grey-800 text-center text-body-secondary text-sm transition-colors duration-100 ease-out hover:bg-grey-700",
        currencyConfig[currency]?.symbol?.length === 2 && "text-[1rem]",
        currencyConfig[currency]?.symbol?.length > 2 && "text-[0.8rem]"
      )}
      onClick={(event) => {
        event.stopPropagation()
        toggleCurrency()
      }}
    >
      {currencyConfig[currency]?.symbol}
    </button>
  )
}

const DefiPositionRow: FC<{
  position: DefiPosition
  status: LoadableStatus
  noCountUp: boolean
}> = ({ position, status, noCountUp }) => {
  const selectedAccounts = usePortfolioSelectedAccounts()
  const navigate = useNavigateWithQuery()

  if (position.id === "SHIMMER")
    return (
      // Fade in to reduce flickering the first time tab is accessed
      <FadeIn className="flex h-[6.6rem] w-full items-center gap-8 rounded-sm bg-grey-850 px-8">
        <div className="size-16 shrink-0 animate-pulse rounded-full bg-body-disabled"></div>
        <div className="flex grow flex-col gap-2">
          <div className="flex w-full animate-pulse items-center justify-between font-bold">
            <div className="rounded-xs bg-body-disabled text-body-disabled">Protocol</div>
            <div className="rounded-xs bg-body-disabled text-body-disabled">TKN/TKN</div>
          </div>
          <div className="flex w-full animate-pulse items-center justify-between font-normal">
            <div className="rounded-xs bg-body-disabled text-body-disabled">Account name</div>
            <div className="rounded-xs bg-body-disabled text-body-disabled">Amount USD</div>
          </div>
        </div>
      </FadeIn>
    )

  return (
    <button
      type="button"
      className={classNames(
        "flex h-[6.6rem] w-full items-center gap-8 overflow-hidden rounded-sm bg-grey-850 px-8 hover:bg-grey-800"
      )}
      onClick={() => navigate(`/portfolio/defi/${position.id}`)}
    >
      {/* AssetLogo can be used with any image and fallbacks to an unknown "Talisman hand" logo */}
      <AssetLogo url={position.defiLogoUrl} className="size-16" />
      <div className="flex w-full grow flex-col gap-2 overflow-hidden">
        <div className="flex w-full items-center justify-between gap-6 overflow-hidden font-bold">
          <div className="flex max-w-full items-center gap-2 overflow-hidden">
            <div className="truncate">{position.defiName}</div>
            <NetworkLogo networkId={position.networkId} className="inline-block" />
          </div>
          <div className="max-w-[50%] shrink-0 truncate">
            <PositionSymbol position={position} />
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-6 font-normal text-body-secondary">
          <div className="truncate">
            {selectedAccounts?.length === 1 ? (
              <PositionType type={position.type} />
            ) : (
              <PortfolioAccount address={position.address} />
            )}
          </div>
          <div className={classNames(status === "loading" && "animate-pulse")}>
            <PositionTotal position={position} noCountUp={noCountUp} />
          </div>
        </div>
      </div>
    </button>
  )
}

const NoDefiPositionFound = () => {
  const { t } = useTranslation()
  const { selectedAccount, selectedFolder } = usePortfolioNavigation()
  const { status } = useDefiPositionsDisplay()

  const msg = useMemo(() => {
    if (status === "loading")
      return <span className="animate-pulse">{t("Loading DeFi positions...")}</span>
    return selectedAccount
      ? t("No DeFi position found for this account")
      : selectedFolder
        ? t("No DeFi position found for this folder")
        : t("No DeFi position found")
  }, [selectedAccount, selectedFolder, status, t])

  return <div className="rounded bg-field px-8 py-36 text-center text-body-secondary">{msg}</div>
}
