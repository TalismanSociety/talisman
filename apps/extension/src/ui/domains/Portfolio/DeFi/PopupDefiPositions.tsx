import { classNames, Loadable, LoadableStatus } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { DefiPosition } from "extension-core"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { FadeIn } from "@talisman/components/FadeIn"
import { useScrollContainer } from "@talisman/components/ScrollContainer"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useDefiPositionsDisplay, usePortfolioSelectedAccounts } from "@ui/state"

import { PortfolioAccount } from "../AssetDetails/PortfolioAccount"
import { usePortfolioNavigation } from "../usePortfolioNavigation"
import { PositionSymbol } from "./PositionSymbol"
import { PositionTotal } from "./PositionTotal"
import { PositionType } from "./PositionType"

export const PopupDefiPositions = () => {
  const positions = useDefiPositionsDisplay()

  return (
    <FadeIn>
      {!positions.data?.length && positions.status !== "loading" ? (
        <NoDefiPositionFound />
      ) : (
        <DefiPositions />
      )}
    </FadeIn>
  )
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
  const { ref: refContainer } = useScrollContainer()
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
        ...(positions.status === "loading" ? [{ id: "SHIMMER" } as DefiPosition] : []),
      ),
    [positions],
  )

  const virtualizer = useVirtualizer({
    count: rows.length,
    overscan: 5,
    gap: 8,
    estimateSize: () => 56,
    getScrollElement: () => refContainer.current,
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
            className="absolute left-0 top-0 h-28 w-full"
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
        0,
      ),
    [positions],
  )

  return (
    <div className="text-body-secondary flex w-full items-center justify-between text-sm">
      <div>{t("Total")}</div>
      <div>
        <FiatFromUsd amount={totalValue} isBalance />
      </div>
    </div>
  )
}

const DefiPositionRow: FC<{
  position: DefiPosition
  status: LoadableStatus
  noCountUp: boolean
}> = ({ position, status, noCountUp }) => {
  const selectedAccounts = usePortfolioSelectedAccounts()
  const navigate = useNavigate()

  if (position.id === "SHIMMER")
    return (
      <div className="bg-grey-850 flex h-28 w-full items-center gap-4 rounded-sm px-6">
        <div className="bg-body-disabled size-16 shrink-0 animate-pulse rounded-full"></div>
        <div className="flex grow flex-col gap-2">
          <div className="flex w-full animate-pulse items-center justify-between text-sm font-bold">
            <div className="text-body-disabled bg-body-disabled rounded-xs">Protocol</div>
            <div className="text-body-disabled bg-body-disabled rounded-xs">TKN/TKN</div>
          </div>
          <div className="flex w-full animate-pulse items-center justify-between text-xs font-normal">
            <div className="text-body-disabled bg-body-disabled rounded-xs">Account name</div>
            <div className="text-body-disabled bg-body-disabled rounded-xs">Amount USD</div>
          </div>
        </div>
      </div>
    )

  return (
    <button
      type="button"
      className={classNames(
        "bg-grey-850 hover:bg-grey-800 flex h-28 w-full items-center gap-4 overflow-hidden rounded-sm px-6",
      )}
      onClick={() => navigate(`/portfolio/defi/${position.id}`)}
    >
      <AssetLogo url={position.defiLogoUrl} className="size-16" />
      <div className="flex w-full grow flex-col gap-2 overflow-hidden">
        <div className="flex w-full items-center justify-between gap-6 overflow-hidden text-sm font-bold">
          <div className="flex max-w-full items-center gap-2 overflow-hidden">
            <div className="truncate">{position.defiName}</div>
            <NetworkLogo networkId={position.networkId} className="inline-block" />
          </div>
          <div className="max-w-[50%] shrink-0 truncate">
            <PositionSymbol position={position} />
          </div>
        </div>
        <div className="text-body-secondary flex w-full items-center justify-between gap-6 text-xs font-normal">
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

  return <div className="text-body-secondary bg-field rounded px-8 py-36 text-center">{msg}</div>
}
