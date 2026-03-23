import type { Token, TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual, normalizeAddress } from "@talismn/crypto"
import { ChevronDownIcon, ChevronRightIcon } from "@talismn/icons"
import { isNotNil, type LoadableStatus } from "@talismn/util"
import { Button } from "@ui/components/Button"
import { NoAssetsFoundSymbol } from "@ui/components/NoAssetsFoundSymbol"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useTokensMap } from "@ui/state/chaindata"
import { usePortfolioGlobalData } from "@ui/state/portfolio"
import type { YieldxyzPositionEnhanced } from "@ui/state/yieldxyz"
import { useYieldxyzPositionsEnhanced } from "@ui/state/yieldxyz"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { isNil, toPairs, uniq } from "lodash-es"
import { type FC, Fragment, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AccountDisplay } from "../shared/AccountDisplay"
import { YieldxyzProviderLogo } from "../yieldxyz/components/YieldxyzProviderLogo"
import { useGetYieldxyzToken } from "../yieldxyz/hooks/useGetYieldxyzToken"
import { EarnTypeBadge } from "./EarnTypeBadge"

const YieldPositionRow: FC<{
  position: YieldxyzPositionEnhanced
  status: LoadableStatus
}> = ({ position, status }) => {
  const navigate = useNavigateWithQuery()

  return (
    <button
      type="button"
      className={cn(
        "flex h-28 w-full items-center gap-6 px-8 text-sm hover:bg-grey-750",
        IS_POPUP && "gap-4 px-6 text-xs"
      )}
      onClick={() =>
        navigate(
          `/earn/positions/yieldxyz/${encodeURIComponent(position.yieldId)}/${encodeURIComponent(position.address)}`
        )
      }
    >
      <YieldxyzProviderLogo providerId={position.product.providerId} className="size-16" />
      <div className="flex grow flex-col items-start justify-center gap-1 overflow-hidden text-left">
        <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
          <div className="h-9 w-full truncate text-body">
            {position.product.metadata.name}{" "}
            <EarnTypeBadge className={cn("shrink-0", IS_POPUP && "hidden")}>
              {position.product.mechanics?.type}
            </EarnTypeBadge>
          </div>
          <div>
            <TokensList position={position} />
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
            <FiatFromUsd amount={position.totalAmountUsd} noCountUp />
          </div>
        </div>
      </div>
    </button>
  )
}

const TokensList: FC<{ position: YieldxyzPositionEnhanced; className?: string }> = ({
  position,
  className,
}) => {
  const { getYieldxyzTokenId } = useGetYieldxyzToken()
  const tokensMap = useTokensMap()
  const tokenIds = useMemo(() => {
    return uniq([
      ...position.product.inputTokens.map((token) => getYieldxyzTokenId(token)),
      ...(position.product.outputToken ? [getYieldxyzTokenId(position.product.outputToken)] : []),
      ...position.balances.map((balance) => getYieldxyzTokenId(balance.token)).filter(isNotNil),
    ])
      .filter(isNotNil)
      .filter((tokenId) => !!tokensMap[tokenId]) // only known tokens
      .sort((a, b) => a.localeCompare(b))
  }, [getYieldxyzTokenId, position, tokensMap])

  return (
    <div
      className={cn("flex w-full shrink-0 items-center truncate font-bold text-body", className)}
    >
      {tokenIds.map((tokenId, i, arr) => (
        <Fragment key={tokenId}>
          <span key={tokenId} className="inline-flex shrink-0 items-center gap-2">
            <TokenLogo tokenId={tokenId} className="size-8" />
            <TokenDisplaySymbol tokenId={tokenId} />
          </span>
          {i < arr.length - 1 && <span className="mx-2 text-white">/</span>}
        </Fragment>
      ))}
    </div>
  )
}

const TokenRow: FC<{
  status: LoadableStatus
  token: Token
  positions: YieldxyzPositionEnhanced[]
  totalUsd: number
}> = ({ token, positions, totalUsd, status }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="w-full overflow-hidden rounded bg-grey-900">
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
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
            <NetworkLogo networkId={token.networkId} className="shrink=0 size-8" />
            <NetworkName networkId={token.networkId} className="truncate" />
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-4",
            status === "loading" && "animate-pulse"
          )}
        >
          <FiatFromUsd amount={totalUsd} noCountUp />
        </div>
        {!isCollapsed ? (
          <ChevronDownIcon className="size-8 shrink-0 text-body-secondary" />
        ) : (
          <ChevronRightIcon className="size-8 shrink-0 text-body-secondary" />
        )}
      </button>
      <div className={cn("flex w-full flex-col", !isCollapsed ? "block" : "hidden")}>
        {!isCollapsed &&
          positions.map((position, i) => (
            <YieldPositionRow
              key={`${position.yieldId}-${i}`}
              status={status}
              position={position}
            />
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

export const EarnPositionsList: FC<{ search: string }> = ({ search }) => {
  const { t } = useTranslation()
  const navigate = useNavigateWithQuery()
  const { isInitialising } = usePortfolioGlobalData()
  const { selectedAccounts } = usePortfolioNavigation()
  const { status, data: positions } = useYieldxyzPositionsEnhanced()
  const isLoading = status === "loading"

  const { getYieldxyzToken } = useGetYieldxyzToken()
  const tokensMay = useTokensMap()

  const positionsByTokenIdMap = useMemo(() => {
    return positions
      ?.map((position) => {
        const tokens = position.product.inputTokens.map((token) => getYieldxyzToken(token))
        if (tokens.some(isNil)) return null // ignore positions with unknown tokens
        return { position, tokenIds: tokens.filter(isNotNil).map((t) => t.id) }
      })
      .filter(isNotNil)
      .reduce<Record<TokenId, YieldxyzPositionEnhanced[]>>((acc, { position, tokenIds }) => {
        for (const tokenId of tokenIds) {
          if (!acc[tokenId]) acc[tokenId] = []
          acc[tokenId].push(position)
        }
        return acc
      }, {})
  }, [positions, getYieldxyzToken])

  const selectedAccountsPositions = useMemo(() => {
    const accountAddresses = selectedAccounts.map((acc) => normalizeAddress(acc.address))
    return toPairs(positionsByTokenIdMap)
      .map(([tokenId, allPositions]) => {
        const positions = allPositions.filter((position) =>
          accountAddresses.some((address) => isAddressEqual(address, position.address))
        )
        const totalUsd = positions.reduce((sum, pos) => {
          return (
            sum + pos.balances.reduce((bSum, bal) => bSum + parseFloat(bal.amountUsd || "0"), 0)
          )
        }, 0)
        return {
          token: tokensMay[tokenId],
          positions,
          totalUsd,
        }
      })
      .filter(({ token, positions }) => !!token && !!positions.length)
      .sort((p1, p2) => p2.totalUsd - p1.totalUsd)
  }, [positionsByTokenIdMap, selectedAccounts, tokensMay])

  const displayPositions = useMemo(() => {
    const lowerSearch = (search || "").toLowerCase().trim()
    if (!lowerSearch) return selectedAccountsPositions

    return selectedAccountsPositions.filter(({ token, positions }) => {
      const search = [token.symbol, token.name]
      for (const position of positions) {
        search.push(
          position.product.metadata.name,
          position.product.providerId,
          ...(position.product.tags ?? [])
        )
        for (const balance of position.balances)
          search.push(balance.token.symbol, balance.token.name)
      }

      return search.join(" ").toLowerCase().includes(lowerSearch)
    })
  }, [search, selectedAccountsPositions])

  //   Toggle handlers
  const { isOpen: isDefiExpanded, toggle: toggleDefiExpanded } = useOpenClose(true)
  const handleDefiToggle = useCallback(() => {
    toggleDefiExpanded()
  }, [toggleDefiExpanded])

  // Calculate total fiat value from all Defi positions
  const totalDefiAmountUsd = useMemo(
    () => displayPositions.reduce((sum, { totalUsd }) => sum + totalUsd, 0),
    [displayPositions]
  )

  if (!displayPositions.length && !isInitialising && !isLoading)
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-12">
        <div className="flex flex-col items-center justify-center gap-2">
          <NoAssetsFoundSymbol className="h-48 w-48" />
          <div className="text-white/30">{t("No DeFi positions found")}</div>
        </div>
        <Button primary small className="px-24" onClick={() => navigate("/earn/discover")}>
          {t("Discover")}
        </Button>
      </div>
    )

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={handleDefiToggle}
        className="mb-4 flex w-full items-center justify-between pr-2 font-medium text-body-secondary text-sm hover:text-body"
      >
        <h2 className="font-medium text-body-secondary text-sm">{t("DeFi Positions")}</h2>
        <div className="flex items-center gap-2">
          <div className="font-normal text-base text-body-secondary">
            <FiatFromUsd amount={totalDefiAmountUsd} />
          </div>
          {isDefiExpanded ? (
            <ChevronDownIcon className="h-8 w-8 text-body-secondary" />
          ) : (
            <ChevronRightIcon className="h-8 w-8 text-body-secondary" />
          )}
        </div>
      </button>
      {isDefiExpanded && (
        <div className="flex flex-col gap-4">
          {displayPositions.map(({ token, positions, totalUsd }) => (
            <TokenRow
              key={token.id}
              token={token}
              positions={positions}
              totalUsd={totalUsd}
              status={status}
            />
          ))}
          {(isInitialising || isLoading) && <EarnTokenRowSkeleton />}
        </div>
      )}
    </div>
  )
}
