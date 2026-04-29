import type { Network, NetworkId, Token, TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual, normalizeAddress } from "@talismn/crypto"
import { ChevronDownIcon, ChevronRightIcon } from "@talismn/icons"
import type { LoadableStatus } from "@talismn/util"
import { Button } from "@ui/components/Button"
import { NoAssetsFoundSymbol } from "@ui/components/NoAssetsFoundSymbol"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useNetworksMapById, useTokensMap } from "@ui/state/chaindata"
import type { NetworkOption } from "@ui/state/portfolio"
import { usePortfolioGlobalData } from "@ui/state/portfolio"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { toPairs } from "lodash-es"
import { type FC, Fragment, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import type { EarnPosition, EarnPositionDisplayToken } from "../hooks/useEarnPositions"
import { useEarnPositions } from "../hooks/useEarnPositions"
import { AccountDisplay } from "../shared/AccountDisplay"
import { EarnTypeBadge } from "./EarnTypeBadge"

const EarnPositionRow: FC<{
  position: EarnPosition
  status: LoadableStatus
}> = ({ position, status }) => {
  const { t } = useTranslation()
  const navigate = useNavigateWithQuery()

  return (
    <button
      type="button"
      className={cn(
        "flex h-28 w-full items-center gap-6 px-8 text-sm hover:bg-grey-750",
        IS_POPUP && "gap-4 px-6 text-xs"
      )}
      onClick={() => navigate(position.detailUrl)}
    >
      <AssetLogo url={position.logoUrl} className="size-16" />
      <div className="flex grow flex-col items-start justify-center gap-1 overflow-hidden text-left">
        <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
          <div className="flex h-9 w-full items-center gap-2 truncate text-body">
            <span className="truncate">{position.title}</span>
            {position.networkId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex shrink-0">
                    <NetworkLogo networkId={position.networkId} className="size-[1.2em]" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <NetworkName networkId={position.networkId} />
                </TooltipContent>
              </Tooltip>
            )}
            {!!position.type && position.type !== "unknown" && (
              <EarnTypeBadge className={cn("shrink-0", IS_POPUP && "hidden")}>
                {position.type}
              </EarnTypeBadge>
            )}
            {position.isReadOnly && (
              <EarnTypeBadge className={cn("shrink-0", IS_POPUP && "hidden")}>
                {t("View Only")}
              </EarnTypeBadge>
            )}
          </div>
          <div className="shrink-0">
            <DisplayTokensList displayTokens={position.displayTokens} />
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-4 overflow-hidden text-body-secondary">
          <div className="flex items-center gap-3 truncate">
            <AccountDisplay
              address={position.address}
              className="gap-[0.4em]"
              iconClassName="text-[1.2em]"
            />
          </div>
          <div className={cn("shrink-0", status === "loading" && "animate-pulse")}>
            <FiatFromUsd amount={position.totalAmountUsd} noCountUp isBalance />
          </div>
        </div>
      </div>
    </button>
  )
}

const DisplayTokensList: FC<{
  displayTokens: EarnPositionDisplayToken[]
  className?: string
}> = ({ displayTokens, className }) => {
  const isTruncated = displayTokens.length > 2
  const visibleTokens = isTruncated ? displayTokens.slice(0, 2) : displayTokens

  const content = (
    <div
      className={cn("flex w-full shrink-0 items-center truncate font-bold text-body", className)}
    >
      {visibleTokens.map((token, i, arr) => (
        <Fragment key={token.tokenId ?? token.symbol}>
          <span className="inline-flex shrink-0 items-center gap-2">
            {token.tokenId ? (
              <TokenLogo tokenId={token.tokenId} className="size-8" />
            ) : (
              <AssetLogo url={token.logoUrl} className="size-8" />
            )}
            {token.tokenId ? (
              <TokenDisplaySymbol tokenId={token.tokenId} />
            ) : (
              <span>{token.symbol}</span>
            )}
          </span>
          {i < arr.length - 1 && <span className="mx-2 text-white">/</span>}
        </Fragment>
      ))}
      {isTruncated && <span className="mx-2 text-white">/ …</span>}
    </div>
  )

  if (!isTruncated) return content

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-2">
          {displayTokens.map((token) => (
            <span key={token.tokenId ?? token.symbol} className="inline-flex items-center gap-2">
              {token.tokenId ? (
                <TokenLogo tokenId={token.tokenId} className="size-8" />
              ) : (
                <AssetLogo url={token.logoUrl} className="size-8" />
              )}
              {token.tokenId ? (
                <TokenDisplaySymbol tokenId={token.tokenId} />
              ) : (
                <span>{token.symbol}</span>
              )}
            </span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

const TokenRow: FC<{
  status: LoadableStatus
  token: Token
  positions: EarnPosition[]
  totalUsd: number
  isCollapsed: boolean
  onToggleCollapsed: () => void
}> = ({ token, positions, totalUsd, status, isCollapsed, onToggleCollapsed }) => {
  return (
    <div className="w-full overflow-hidden rounded bg-grey-900">
      <button
        type="button"
        onClick={onToggleCollapsed}
        className={cn(
          "flex h-28 w-full items-center gap-6 overflow-hidden px-8 hover:bg-grey-750",
          !isCollapsed && "bg-grey-800",
          IS_POPUP && "gap-4 px-6"
        )}
      >
        <TokenLogo tokenId={token.id} className="size-16" />
        <div className="flex grow flex-col justify-center gap-2 overflow-hidden text-left font-medium text-body-secondary text-sm">
          <div className="truncate">
            <span className="font-bold text-body">
              <TokenDisplaySymbol tokenId={token.id} />
            </span>{" "}
            {token.name}
          </div>
          <div className="flex w-full items-center gap-2 overflow-hidden">
            <NetworkLogo networkId={token.networkId} className="size-8 shrink-0" />
            <NetworkName networkId={token.networkId} className="truncate" />
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-4",
            status === "loading" && "animate-pulse"
          )}
        >
          <FiatFromUsd amount={totalUsd} noCountUp isBalance />
        </div>
        {!isCollapsed ? (
          <ChevronDownIcon className="size-8 shrink-0 text-body-secondary" />
        ) : (
          <ChevronRightIcon className="size-8 shrink-0 text-body-secondary" />
        )}
      </button>
      <div className={cn("flex w-full flex-col", !isCollapsed ? "block" : "hidden")}>
        {!isCollapsed &&
          positions.map((position, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: earn positions for e.g. LPs have multiple tokens, and are therefore rendered in multiple TokenRows, so the index is the only stable key available
            <EarnPositionRow key={index} status={status} position={position} />
          ))}
      </div>
    </div>
  )
}

const NetworkRow: FC<{
  status: LoadableStatus
  networkId: NetworkId
  network: Network | undefined
  positions: EarnPosition[]
  totalUsd: number
  isCollapsed: boolean
  onToggleCollapsed: () => void
}> = ({ networkId, network, positions, totalUsd, status, isCollapsed, onToggleCollapsed }) => {
  return (
    <div className="w-full overflow-hidden rounded bg-grey-900">
      <button
        type="button"
        onClick={onToggleCollapsed}
        className={cn(
          "flex h-28 w-full items-center gap-6 overflow-hidden px-8 hover:bg-grey-750",
          !isCollapsed && "bg-grey-800",
          IS_POPUP && "gap-4 px-6"
        )}
      >
        <NetworkLogo networkId={networkId} className="size-16" />
        <div className="flex grow flex-col justify-center gap-2 overflow-hidden text-left font-medium text-body-secondary text-sm">
          <div className="truncate font-bold text-body">{network?.name ?? networkId}</div>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-4",
            status === "loading" && "animate-pulse"
          )}
        >
          <FiatFromUsd amount={totalUsd} noCountUp isBalance />
        </div>
        {!isCollapsed ? (
          <ChevronDownIcon className="size-8 shrink-0 text-body-secondary" />
        ) : (
          <ChevronRightIcon className="size-8 shrink-0 text-body-secondary" />
        )}
      </button>
      <div className={cn("flex w-full flex-col", !isCollapsed ? "block" : "hidden")}>
        {!isCollapsed &&
          positions.map((position) => (
            <EarnPositionRow key={position.id} status={status} position={position} />
          ))}
      </div>
    </div>
  )
}

const EarnTokenRowSkeleton: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        "mb-4 grid w-full grid-cols-[40%_30%_30%] rounded bg-grey-850 text-left text-base text-body-secondary",
        className
      )}
    >
      <div>
        <div className="flex h-16.5">
          <div className="p-8 text-xl">
            <div className="h-16 w-16 animate-pulse rounded-full bg-grey-700"></div>
          </div>
          <div className="flex grow flex-col justify-center gap-2">
            <div className="h-8 w-20 animate-pulse rounded-xs bg-grey-700"></div>
          </div>
        </div>
      </div>
      <div></div>
      <div>
        <div className="flex h-full flex-col items-end justify-center gap-2 px-8">
          <div className="h-8 w-25 animate-pulse rounded-xs bg-grey-700"></div>
          <div className="h-8 w-15 animate-pulse rounded-xs bg-grey-700"></div>
        </div>
      </div>
    </div>
  )
}

export const EarnPositionsList: FC<{
  search: string
  sortBy?: "total" | "name"
  groupBy?: "token" | "network" | "none"
  networkFilter?: NetworkOption | null
}> = ({ search, sortBy = "total", groupBy = "none", networkFilter }) => {
  const { t } = useTranslation()
  const navigate = useNavigateWithQuery()
  const { isInitialising } = usePortfolioGlobalData()
  const { selectedAccounts } = usePortfolioNavigation()
  const { status, data: positions } = useEarnPositions()
  const isLoading = status === "loading"

  const tokensMap = useTokensMap()
  const networksMap = useNetworksMapById()

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const filteredPositions = useMemo(() => {
    if (!networkFilter) return positions ?? []
    return (positions ?? []).filter((p) =>
      p.networkId ? networkFilter.networkIds.includes(p.networkId) : false
    )
  }, [positions, networkFilter])

  const positionsByTokenIdMap = useMemo(() => {
    return filteredPositions.reduce<Record<TokenId, EarnPosition[]>>((acc, position) => {
      for (const tokenId of position.tokenIds) {
        if (!acc[tokenId]) acc[tokenId] = []
        acc[tokenId].push(position)
      }
      return acc
    }, {})
  }, [filteredPositions])

  const selectedAccountsPositions = useMemo(() => {
    const accountAddresses = selectedAccounts.map((acc) => normalizeAddress(acc.address))
    return toPairs(positionsByTokenIdMap)
      .map(([tokenId, allPositions]) => {
        const positions = allPositions.filter((position) =>
          accountAddresses.some((address) => isAddressEqual(address, position.address))
        )
        const totalUsd = positions.reduce((sum, pos) => sum + pos.totalAmountUsd, 0)
        return {
          token: tokensMap[tokenId],
          positions,
          totalUsd,
        }
      })
      .filter(
        (entry): entry is { token: Token; positions: EarnPosition[]; totalUsd: number } =>
          !!entry.token && !!entry.positions.length
      )
      .sort((p1, p2) =>
        sortBy === "name"
          ? p1.token.symbol.localeCompare(p2.token.symbol)
          : p2.totalUsd - p1.totalUsd
      )
  }, [positionsByTokenIdMap, selectedAccounts, tokensMap, sortBy])

  const tokenGroupedPositions = useMemo(() => {
    const lowerSearch = (search || "").toLowerCase().trim()
    if (!lowerSearch) return selectedAccountsPositions

    return selectedAccountsPositions.filter(({ token, positions }) => {
      const terms = [token.symbol, token.name]
      for (const position of positions) {
        terms.push(...position.searchTerms)
      }
      return terms.join(" ").toLowerCase().includes(lowerSearch)
    })
  }, [search, selectedAccountsPositions])

  const deduplicatedPositions = useMemo(() => {
    const seen = new Set<string>()
    const result: EarnPosition[] = []
    for (const { positions } of tokenGroupedPositions) {
      for (const pos of positions) {
        if (seen.has(pos.id)) continue
        seen.add(pos.id)
        result.push(pos)
      }
    }
    result.sort((a, b) =>
      sortBy === "name" ? a.title.localeCompare(b.title) : b.totalAmountUsd - a.totalAmountUsd
    )
    return result
  }, [tokenGroupedPositions, sortBy])

  const networkGroupedPositions = useMemo(() => {
    if (groupBy !== "network") return []
    const byNetwork = new Map<string, EarnPosition[]>()
    for (const pos of deduplicatedPositions) {
      const key = pos.networkId ?? "unknown"
      if (!byNetwork.has(key)) byNetwork.set(key, [])
      byNetwork.get(key)!.push(pos)
    }
    return Array.from(byNetwork.entries())
      .map(([networkId, positions]) => ({
        networkId,
        network: networksMap[networkId],
        positions,
        totalUsd: positions.reduce((sum, p) => sum + p.totalAmountUsd, 0),
      }))
      .sort((a, b) =>
        sortBy === "name"
          ? (a.network?.name ?? a.networkId).localeCompare(b.network?.name ?? b.networkId)
          : b.totalUsd - a.totalUsd
      )
  }, [deduplicatedPositions, groupBy, networksMap, sortBy])

  const allGroupKeys = useMemo(() => {
    if (groupBy === "token") return tokenGroupedPositions.map((g) => g.token.id)
    if (groupBy === "network") return networkGroupedPositions.map((g) => g.networkId)
    return []
  }, [groupBy, tokenGroupedPositions, networkGroupedPositions])

  const allCollapsed = useMemo(
    () => allGroupKeys.length > 0 && allGroupKeys.every((k) => collapsedGroups.has(k)),
    [allGroupKeys, collapsedGroups]
  )

  const toggleAll = useCallback(() => {
    if (allCollapsed) {
      setCollapsedGroups(new Set())
    } else {
      setCollapsedGroups(new Set(allGroupKeys))
    }
  }, [allCollapsed, allGroupKeys])

  const totalDefiAmountUsd = useMemo(
    () => deduplicatedPositions.reduce((sum, pos) => sum + pos.totalAmountUsd, 0),
    [deduplicatedPositions]
  )

  if (!tokenGroupedPositions.length && !isInitialising && !isLoading)
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-12 rounded bg-grey-900",
          IS_POPUP ? "py-8" : "py-24"
        )}
      >
        <div className="flex flex-col items-center justify-center">
          <NoAssetsFoundSymbol className="h-48 w-48" />
          <div className="text-white/30">{t("No positions found")}</div>
        </div>
        <Button
          primary
          small={IS_POPUP}
          className="px-16"
          onClick={() => navigate("/earn/discover")}
        >
          {t("Discover")}
        </Button>
      </div>
    )

  return (
    <div className="mb-6">
      <div className="mb-4 flex w-full items-center justify-between pr-2 font-medium text-body-secondary text-sm">
        <h2 className="font-medium text-body-secondary text-sm">{t("DeFi Positions")}</h2>
        {groupBy === "token" || groupBy === "network" ? (
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-2 font-normal text-base text-body-secondary hover:text-body"
          >
            <FiatFromUsd amount={totalDefiAmountUsd} isBalance />
            {allCollapsed ? (
              <ChevronRightIcon className="size-8" />
            ) : (
              <ChevronDownIcon className="size-8" />
            )}
          </button>
        ) : (
          <div className="font-normal text-base text-body-secondary">
            <FiatFromUsd amount={totalDefiAmountUsd} isBalance />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4">
        {groupBy === "token" &&
          tokenGroupedPositions.map(({ token, positions, totalUsd }) => (
            <TokenRow
              key={token.id}
              token={token}
              positions={positions}
              totalUsd={totalUsd}
              status={status}
              isCollapsed={collapsedGroups.has(token.id)}
              onToggleCollapsed={() => toggleGroup(token.id)}
            />
          ))}
        {groupBy === "network" &&
          networkGroupedPositions.map(({ networkId, network, positions, totalUsd }) => (
            <NetworkRow
              key={networkId}
              networkId={networkId}
              network={network}
              positions={positions}
              totalUsd={totalUsd}
              status={status}
              isCollapsed={collapsedGroups.has(networkId)}
              onToggleCollapsed={() => toggleGroup(networkId)}
            />
          ))}
        {groupBy === "none" &&
          deduplicatedPositions.map((position) => (
            <div key={position.id} className="w-full overflow-hidden rounded bg-grey-900">
              <EarnPositionRow position={position} status={status} />
            </div>
          ))}
        {(isInitialising || isLoading) && <EarnTokenRowSkeleton />}
      </div>
    </div>
  )
}
