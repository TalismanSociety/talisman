import type { YieldDto } from "@core/domains/earn/exports"
import type { Balances } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { ChevronRightIcon } from "@talismn/icons"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { useNetworkById, useNetworksMapById, useToken, useTokensMap } from "@ui/state/chaindata"
import type { NetworkOption } from "@ui/state/portfolio"
import { useSelectedCurrency } from "@ui/state/settings"
import { useYieldxyzProviders } from "@ui/state/yieldxyz"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useYieldxyzEnterModal } from "../yieldxyz/enter/useYieldxyzEnterModal"
import {
  type TokenOpportunity,
  useYieldxyzOpportunitiesByTokenId,
} from "../yieldxyz/hooks/useYieldxyzOpportunitiesByTokenId"

const EARN_GRID_COLS = IS_POPUP ? "grid-cols-[70%_30%]" : "grid-cols-[40%_30%_30%]"

export const EarnAvailableProducts: FC<{
  search: string
  sortBy?: "yield" | "name"
  typeFilter?: string | null
  providerFilter?: string | null
  networkFilter?: NetworkOption | null
}> = ({ search, sortBy = "yield", typeFilter, providerFilter, networkFilter }) => {
  useYieldxyzProviders() // preload providers (so their names and logos are available when expanding token rows)
  const { t } = useTranslation()
  const tokensMap = useTokensMap()
  const networksMap = useNetworksMapById()

  const { status, heldProducts, discoverProducts } = useYieldxyzOpportunitiesByTokenId()

  const applyFilters = useMemo(() => {
    const hasTypeFilter = !!typeFilter
    const hasProviderFilter = !!providerFilter
    const hasNetworkFilter = !!networkFilter
    const lowerSearch = search?.toLowerCase().trim() ?? ""
    const hasSearch = lowerSearch.length > 0

    if (!hasTypeFilter && !hasProviderFilter && !hasNetworkFilter && !hasSearch) return null

    return (opportunities: TokenOpportunity[]): TokenOpportunity[] => {
      return opportunities
        .map((opp) => {
          // Filter by network at the token level
          if (hasNetworkFilter) {
            const token = tokensMap[opp.tokenId]
            if (!token || !networkFilter.networkIds.includes(token.networkId)) return null
          }

          // Filter by search at the token level
          if (hasSearch) {
            const token = tokensMap[opp.tokenId]
            const network = token ? networksMap[token.networkId] : null
            const searcheable = [token?.symbol ?? "", token?.name ?? "", network?.name ?? ""]
              .join(" ")
              .toLowerCase()
            if (!searcheable.includes(lowerSearch)) return null
          }

          // Filter individual products by type/provider
          if (hasTypeFilter || hasProviderFilter) {
            const filtered = opp.products.filter((p) => {
              if (hasTypeFilter && p.mechanics.type !== typeFilter) return false
              if (hasProviderFilter && p.providerId !== providerFilter) return false
              return true
            })
            if (!filtered.length) return null

            return {
              ...opp,
              products: filtered,
              bestApr: Math.max(...filtered.map((p) => p.rewardRate.total * 100)),
            }
          }

          return opp
        })
        .filter((opp): opp is TokenOpportunity => opp !== null)
    }
  }, [search, typeFilter, providerFilter, networkFilter, tokensMap, networksMap])

  const sortFn = useMemo(() => {
    if (sortBy === "name") {
      return (a: TokenOpportunity, b: TokenOpportunity) => {
        const tokenA = tokensMap[a.tokenId]
        const tokenB = tokensMap[b.tokenId]
        return (tokenA?.symbol ?? "").localeCompare(tokenB?.symbol ?? "")
      }
    }
    return null
  }, [sortBy, tokensMap])

  const displayHeld = useMemo(() => {
    let result = applyFilters ? applyFilters(heldProducts ?? []) : (heldProducts ?? [])
    if (sortFn) result = [...result].sort(sortFn)
    return result
  }, [heldProducts, applyFilters, sortFn])

  const displayDiscover = useMemo(() => {
    let result = applyFilters ? applyFilters(discoverProducts ?? []) : (discoverProducts ?? [])
    if (sortFn) result = [...result].sort(sortFn)
    return result
  }, [discoverProducts, applyFilters, sortFn])

  return (
    <div className="flex w-full flex-col gap-4 overflow-hidden">
      {(status === "loading" || !!displayHeld?.length) && (
        <div
          className={cn(
            "grid font-medium text-body-secondary text-xs",
            EARN_GRID_COLS,
            IS_POPUP ? "px-6" : "px-8"
          )}
        >
          <div>{t("Token")}</div>
          {!IS_POPUP && <div className="text-right">{t("Eligible Assets")}</div>}
          <div className="text-right">{t("APY up to")}</div>
        </div>
      )}
      {displayHeld?.map(({ tokenId, products, bestApr, balances }) => (
        <TokenProducts
          key={tokenId}
          products={products}
          tokenId={tokenId}
          bestApr={bestApr}
          balances={balances}
          isLoading={status === "loading"}
        />
      ))}
      {!!displayDiscover?.length && (
        <>
          <h2 className="mt-4 font-medium text-body-secondary text-sm">
            {t("Discover Opportunities")}
          </h2>
          <div className={cn("grid gap-4", IS_POPUP ? "grid-cols-2" : "grid-cols-4")}>
            {displayDiscover.map(({ tokenId, products, bestApr }) => (
              <DiscoverTokenCard
                key={tokenId}
                tokenId={tokenId}
                products={products}
                bestApr={bestApr}
                isLoading={status === "loading"}
              />
            ))}
          </div>
        </>
      )}
      {status === "loading" && <TokenProductsShimmer />}
      {status === "success" && !displayHeld?.length && !displayDiscover?.length && (
        <div className="rounded-sm bg-black-secondary py-10 text-center text-base text-body-secondary">
          {t("No opportunities found")}
        </div>
      )}
    </div>
  )
}

const TokenProducts: FC<{
  tokenId: TokenId
  products: YieldDto[]
  bestApr: number
  balances: Balances
  isLoading?: boolean
}> = ({ tokenId, bestApr, balances, isLoading }) => {
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)
  const { open } = useYieldxyzEnterModal()
  const currency = useSelectedCurrency()
  const fiatTransferable = useMemo(
    () => balances.sum.fiat(currency).transferable,
    [balances, currency]
  )

  if (!token || !network) return null

  return (
    <div className="w-full overflow-hidden rounded bg-grey-900">
      <button
        type="button"
        onClick={() => open({ pickerTokenId: tokenId })}
        className={cn(
          "grid h-28 w-full items-center overflow-hidden hover:bg-grey-750",
          EARN_GRID_COLS,
          IS_POPUP ? "px-6" : "px-8"
        )}
      >
        <div className={cn("flex items-center overflow-hidden", IS_POPUP ? "gap-4" : "gap-6")}>
          <TokenLogo tokenId={tokenId} className="size-16" />
          <div className="flex min-w-0 flex-col justify-center gap-2 overflow-hidden text-left font-medium text-body-secondary text-sm">
            <div className="truncate">
              <span className="font-bold text-body">
                <TokenDisplaySymbol tokenId={tokenId} />
              </span>{" "}
              {token.name}
            </div>
            <div className="flex items-center gap-2 overflow-hidden text-body-secondary">
              <NetworkLogo networkId={token.networkId} className="size-8 shrink-0" />
              <NetworkName networkId={token.networkId} className="truncate" />
            </div>
          </div>
        </div>
        {!IS_POPUP && (
          <div className="flex flex-col items-end gap-1 text-right font-medium text-sm">
            <TokensAndFiat
              tokenId={tokenId}
              planck={balances.sum.planck.transferable}
              noFiat
              isBalance
              tokensClassName="font-bold text-body"
            />
            <Fiat amount={fiatTransferable} isBalance className="text-body-secondary" />
          </div>
        )}
        <div className="flex items-center justify-end gap-4">
          <div className={cn("font-bold text-primary text-sm", isLoading && "animate-pulse")}>
            {bestApr.toFixed(2)}%
          </div>
          <ChevronRightIcon className="size-10 shrink-0" />
        </div>
      </button>
    </div>
  )
}

const DiscoverTokenCard: FC<{
  tokenId: TokenId
  products: YieldDto[]
  bestApr: number
  isLoading?: boolean
}> = ({ tokenId, bestApr, isLoading }) => {
  const { t } = useTranslation()
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)
  const { open } = useYieldxyzEnterModal()

  if (!token || !network) return null

  return (
    <div className="self-start overflow-hidden rounded bg-grey-900">
      <button
        type="button"
        onClick={() => open({ pickerTokenId: tokenId, discoverOnly: true })}
        className="flex w-full flex-col gap-2 p-6 text-left text-sm hover:bg-grey-750"
      >
        <div className="flex w-full items-center gap-4">
          <TokenLogo tokenId={tokenId} className="size-16 shrink-0" />
          <div className="flex grow flex-col gap-2 overflow-hidden">
            <div className="truncate font-bold text-body">
              <TokenDisplaySymbol tokenId={tokenId} />
            </div>
            <div className="flex items-center gap-2 overflow-hidden text-body-secondary">
              <NetworkLogo networkId={token.networkId} className="size-8 shrink-0" />
              <NetworkName networkId={token.networkId} className="truncate" />
            </div>
          </div>
        </div>
        <div
          className={cn(
            "ml-20 flex items-center gap-1 font-bold text-primary text-xs",
            isLoading && "animate-pulse"
          )}
        >
          {t("Up to {{bestApr}}%", { bestApr: bestApr.toFixed(2) })}
          <ChevronRightIcon className="size-7 shrink-0 text-body-secondary" />
        </div>
      </button>
    </div>
  )
}

const TokenProductsShimmer = () => (
  <div
    className={cn(
      "grid h-28 items-center rounded bg-grey-900",
      EARN_GRID_COLS,
      IS_POPUP ? "px-6" : "px-8"
    )}
  >
    <div className={cn("flex items-center overflow-hidden", IS_POPUP ? "gap-4" : "gap-6")}>
      <div className="size-16 shrink-0 animate-pulse rounded-full bg-grey-700"></div>
      <div className="flex min-w-0 flex-col justify-center gap-2 text-left font-medium text-sm">
        <div className="flex">
          <div className="animate-pulse rounded-xs bg-grey-700 font-bold text-grey-700">
            XXXX Token Name
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="size-8 animate-pulse rounded-full bg-grey-700"></div>
          <div className="animate-pulse truncate rounded-xs bg-grey-700 text-grey-700">
            Network Name
          </div>
        </div>
      </div>
    </div>
    {!IS_POPUP && (
      <div className="flex flex-col items-end gap-2 text-nowrap font-medium text-sm">
        <div className="animate-pulse rounded-xs bg-grey-700 text-grey-700">0.0000 XXX</div>
        <div className="animate-pulse rounded-xs bg-grey-700 text-grey-700">$0.00</div>
      </div>
    )}
    <div className="flex items-center justify-end gap-4">
      <div className="animate-pulse rounded-xs bg-grey-700 text-grey-700">00.00%</div>
      <ChevronRightIcon className="invisible size-10 shrink-0" />
    </div>
  </div>
)
