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
import { useSelectedCurrency } from "@ui/state/settings"
import { useYieldxyzProviders } from "@ui/state/yieldxyz"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useYieldxyzEnterModal } from "../yieldxyz/enter/useYieldxyzEnterModal"
import {
  type TokenOpportunity,
  useYieldxyzOpportunitiesByTokenId,
} from "../yieldxyz/hooks/useYieldxyzOpportunitiesByTokenId"

const EARN_GRID_COLS = IS_POPUP ? "grid-cols-[70%_30%]" : "grid-cols-[40%_30%_30%]"

export const EarnAvailableProducts: FC<{
  search: string
}> = ({ search }) => {
  useYieldxyzProviders() // preload providers (so their names and logos are available when expanding token rows)
  const { t } = useTranslation()
  const tokensMap = useTokensMap()
  const networksMap = useNetworksMapById()

  const { status, heldProducts, discoverProducts } = useYieldxyzOpportunitiesByTokenId()

  const filterBySearch = useMemo(() => {
    if (!search) return null

    const lowerSearch = search.toLowerCase()
    return (p: TokenOpportunity) => {
      const token = tokensMap[p.tokenId]
      const network = token ? networksMap[token.networkId] : null
      const searcheable = [token?.symbol ?? "", token?.name ?? "", network?.name ?? ""]
        .join(" ")
        .toLowerCase()
      return searcheable.includes(lowerSearch)
    }
  }, [search, tokensMap, networksMap])

  const displayHeld = useMemo(
    () => (filterBySearch ? heldProducts?.filter(filterBySearch) : heldProducts),
    [heldProducts, filterBySearch]
  )

  const displayDiscover = useMemo(
    () => (filterBySearch ? discoverProducts?.filter(filterBySearch) : discoverProducts),
    [discoverProducts, filterBySearch]
  )

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
          <div className={cn("grid gap-4", IS_POPUP ? "grid-cols-1" : "grid-cols-2")}>
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
      {status === "success" && !heldProducts?.length && !discoverProducts?.length && (
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
              tokensClassName="font-bold text-body"
            />
            <Fiat amount={fiatTransferable} isBalance className="text-body-secondary" />
          </div>
        )}
        <div className="flex items-center justify-end gap-4">
          <div className={cn("font-bold text-primary", isLoading && "animate-pulse")}>
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
        onClick={() => open({ pickerTokenId: tokenId })}
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
          <ChevronRightIcon className="size-10 shrink-0" />
        </div>
        <div className={cn("ml-20 text-body-secondary", isLoading && "animate-pulse")}>
          <Trans
            t={t}
            defaults="Up to <Highlight>{{bestApr}}%</Highlight>"
            values={{ bestApr: bestApr.toFixed(2) }}
            components={{ Highlight: <span className="font-bold text-primary" /> }}
          />
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
