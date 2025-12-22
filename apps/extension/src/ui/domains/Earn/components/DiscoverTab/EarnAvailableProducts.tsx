import { Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { ChevronRightIcon, LockIcon, UsersIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { YieldDto } from "extension-core"
import { t } from "i18next"
import { FC, PropsWithChildren, ReactNode, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useNetworkById, useNetworksMapById, useToken, useTokensMap } from "@ui/state"
import { useYieldxyzProviders } from "@ui/state/yield"

import { useYieldxyzProductsByTokenId } from "../../hooks/useYieldxyzProductsByTokenId"
import { YieldxyzProviderLogo } from "../../yieldxyz/components/YieldxyzProviderLogo"
import { useYieldxyzEnterModal } from "../../yieldxyz/enter/useYieldxyzEnterModal"
import { EarnTypeBadge } from "../EarnTypeBadge"

export const EarnAvailableProducts: FC<{
  isPopup?: boolean
  search: string
}> = ({ search }) => {
  useYieldxyzProviders() // preload providers (so their names and logos are available when expanding token rows)
  const { t } = useTranslation()
  const tokensMap = useTokensMap()
  const networksMap = useNetworksMapById()

  const { status, data: products } = useYieldxyzProductsByTokenId()

  const displayProducts = useMemo(() => {
    if (!search) return products

    const lowerSearch = search.toLowerCase()
    return products?.filter((p) => {
      const token = tokensMap[p.tokenId]
      const network = token ? networksMap[token.networkId] : null
      const searcheable = [token?.symbol ?? "", token.name ?? "", network?.name ?? ""]
        .join(" ")
        .toLowerCase()
      return searcheable.includes(lowerSearch)
    })
  }, [products, search, tokensMap, networksMap])

  return (
    <div className="flex w-full flex-col gap-4 overflow-hidden">
      {displayProducts?.map(({ tokenId, products, bestApr, balances }) => (
        <TokenProducts
          key={tokenId}
          products={products}
          tokenId={tokenId}
          bestApr={bestApr}
          balances={balances}
          isLoading={status === "loading"}
        />
      ))}
      {status === "loading" && <TokenProductsShimmer />}
      {status === "success" && !products?.length && (
        <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-base">
          {t("No opportunities found for your assets")}
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
}> = ({ tokenId, products, bestApr, balances, isLoading }) => {
  const { t } = useTranslation()
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)
  const { isOpen, toggle } = useOpenClose()

  if (!token || !network) return null

  return (
    <div className="bg-grey-900 w-full overflow-hidden rounded">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "hover:bg-grey-750 flex h-28 w-full items-center gap-6 overflow-hidden px-8",
          isOpen && "bg-grey-800",
        )}
      >
        <TokenLogo tokenId={tokenId} className="size-16" />
        <div className="text-body-secondary flex grow flex-col justify-center gap-2 text-left text-sm font-medium">
          <div className="">
            <span className="text-body font-bold">
              <TokenDisplaySymbol tokenId={tokenId} />
            </span>{" "}
            {token.name}
          </div>
          <div className="flex w-full items-center gap-2 overflow-hidden">
            <NetworkLogo networkId={token.networkId} className="shrink=0 size-8" />
            <NetworkName networkId={token.networkId} className="truncate" />
          </div>
        </div>
        <div className="text-body-inactive flex shrink-0 flex-col items-end justify-end gap-2 text-nowrap text-sm font-medium">
          <div className="text-body-secondary">
            <TokensAndFiat
              tokenId={tokenId}
              planck={balances.sum.planck.transferable}
              tokensClassName="text-body"
              fiatClassName=" text-sm font-medium"
            />
          </div>
          <div className={cn(isLoading && "animate-pulse")}>
            <Trans
              t={t}
              defaults="APY up to <Highlight>{{bestApr}}%</Highlight>"
              values={{ bestApr: bestApr.toFixed(2) }}
              components={{ Highlight: <span className="text-primary font-bold" /> }}
            />
          </div>
        </div>
        <ChevronRightIcon
          className={cn("size-10 shrink-0 transition-transform", isOpen && "rotate-90")}
        />
      </button>
      <div className={cn("flex w-full flex-col", isOpen ? "block" : "hidden")}>
        {isOpen && products.map((product) => <ProductRow key={product.id} product={product} />)}
      </div>
    </div>
  )
}

const ProductRow: FC<{ product: YieldDto }> = ({ product }) => {
  const { t } = useTranslation()
  const { selectedAccount } = usePortfolioNavigation()
  const { open } = useYieldxyzEnterModal()

  return (
    <button
      type="button"
      className="hover:bg-grey-750 flex h-28 w-full items-center gap-6 px-8 text-sm"
      onClick={() => open({ productId: product.id, address: selectedAccount?.address })}
    >
      <YieldxyzProviderLogo providerId={product.providerId} className="size-16 shrink-0" />
      <div className="flex grow flex-col items-start justify-start gap-2">
        <div className="text-body">
          {product.metadata.name} <EarnTypeBadge>{product.mechanics?.type}</EarnTypeBadge>
        </div>
        <div className="flex items-center gap-4">
          <Metric icon={<UsersIcon />} tooltip={t("Number of unique holders")}>
            {product.statistics?.uniqueUsers}
          </Metric>
          <Metric icon={<LockIcon />} tooltip={t("Total value locked")}>
            {Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              notation: "compact",
            }).format(Number(product.statistics?.tvlUsd ?? 0))}
          </Metric>
        </div>
      </div>
      <div className="shrink-0 text-nowrap">
        {product.rewardRate.rateType}:{" "}
        <span className="text-primary-500 font-bold">
          {(product.rewardRate.total * 100).toFixed(2)}%
        </span>
      </div>
    </button>
  )
}

const Metric: FC<
  PropsWithChildren<{ icon: ReactNode; tooltip: ReactNode; className?: string }>
> = ({ children, icon, tooltip, className }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className={cn("inline-flex shrink-0 items-center gap-2", className)}>
        <div className="shrink-0 align-text-bottom font-medium">{icon}</div>
        <div>{children ?? t("N/A")}</div>
      </div>
    </TooltipTrigger>
    <TooltipContent>{tooltip}</TooltipContent>
  </Tooltip>
)

const TokenProductsShimmer = () => (
  <div className="bg-grey-900 flex h-28 items-center gap-6 rounded px-8">
    <div className="bg-grey-700 size-16 shrink-0 animate-pulse rounded-full"></div>
    <div className="flex grow flex-col justify-center gap-2 text-left text-sm font-medium">
      <div className="flex">
        <div className="bg-grey-700 text-grey-700 rounded-xs animate-pulse font-bold">
          XXXX Token Name
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="bg-grey-700 size-8 animate-pulse rounded-full"></div>
          <div className="bg-grey-700 text-grey-700 rounded-xs animate-pulse truncate">
            Network Name
          </div>
        </div>
      </div>
    </div>
    <div className="flex shrink-0 flex-col items-end justify-end gap-2 text-nowrap text-sm font-medium">
      <div className="text-grey-700 bg-grey-700 rounded-xs animate-pulse">0.0000 XXX ($0.00)</div>
      <div className="text-grey-700 bg-grey-700 rounded-xs animate-pulse">APY up to 00.00%</div>
    </div>
    <ChevronRightIcon className="invisible size-10 shrink-0" />
  </div>
)
