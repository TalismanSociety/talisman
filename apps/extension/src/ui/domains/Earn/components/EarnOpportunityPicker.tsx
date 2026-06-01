import { CheckCircleIcon, LockIcon } from "@talismn/icons"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { cn } from "@ui/util/cn"
import { type FC, type PropsWithChildren, type ReactNode, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import type { YieldxyzEarnOpportunity } from "../hooks/useEarnOpportunitiesByTokenId"
import type { EarnOpportunity } from "../types"
import { YieldxyzProductYieldDisplay } from "../yieldxyz/components/YieldxyzProductYieldDisplay"
import { YieldxyzProviderLogo } from "../yieldxyz/components/YieldxyzProviderLogo"

export const EarnOpportunityPicker: FC<{
  opportunities: EarnOpportunity[]
  selectedId?: string | null
  onSelect: (opportunity: EarnOpportunity) => void
  disabledReason?: string | null
}> = ({ opportunities, selectedId, onSelect, disabledReason }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const displayOpportunities = useMemo(() => {
    if (!search) return opportunities

    const lowerSearch = search.toLowerCase()
    return opportunities.filter((opp) =>
      [opp.title, ...opp.searchTerms].join(" ").toLowerCase().includes(lowerSearch)
    )
  }, [opportunities, search])

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-fit w-full flex-col items-center gap-2 px-12 pb-8">
        <SearchInput onChange={setSearch} placeholder={t("Search DeFi products")} />
      </div>
      <ScrollContainer className="scrollable h-full w-full grow overflow-x-hidden border-grey-700 border-t bg-black-secondary">
        <div>
          {displayOpportunities.map((opportunity) => (
            <OpportunityRow
              key={opportunity.id}
              opportunity={opportunity}
              selected={opportunity.id === selectedId}
              onClick={() => onSelect(opportunity)}
              disabledReason={disabledReason}
            />
          ))}
          {!displayOpportunities.length && (
            <div className="flex h-14.5 w-full items-center px-12 text-left text-body-secondary">
              {t("No product matches your search")}
            </div>
          )}
        </div>
      </ScrollContainer>
    </div>
  )
}

const OpportunityRow: FC<{
  opportunity: EarnOpportunity
  selected: boolean
  onClick: () => void
  disabledReason?: string | null
}> = ({ opportunity, selected, onClick, disabledReason }) => {
  const { t } = useTranslation()
  const disabled = !!disabledReason
  const product =
    opportunity.system === "yieldxyz" ? (opportunity as YieldxyzEarnOpportunity).product : undefined

  return (
    <Tooltip placement="center">
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          tabIndex={0}
          className={cn(
            "flex h-14.5 w-full items-center gap-4 px-12 text-left text-sm",
            !disabled && "hover:bg-grey-750 focus:bg-grey-700",
            selected && "bg-grey-800 text-body-secondary",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:[&_*]:pointer-events-none"
          )}
        >
          {product ? (
            <YieldxyzProviderLogo
              providerId={opportunity.providerId}
              className="shrink-0 text-xl!"
            />
          ) : (
            <div className="inline-block size-16 shrink-0 text-xl!">
              <AssetLogo url={opportunity.providerLogoURI} className="size-full" />
            </div>
          )}
          <div className="flex grow items-center overflow-hidden">
            <div className="flex w-full flex-col gap-2 overflow-hidden">
              <div className="truncate">{opportunity.title}</div>
              {product && (
                <Metric
                  icon={<LockIcon />}
                  tooltip={t("Total value locked")}
                  className="text-body-secondary text-xs"
                >
                  {product.statistics &&
                    Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      notation: "compact",
                    }).format(Number(product.statistics?.tvlUsd ?? 0))}
                </Metric>
              )}
            </div>
            {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
          </div>
          <div className="shrink-0 text-right">
            {product ? (
              <YieldxyzProductYieldDisplay product={product} />
            ) : opportunity.apr == null ? null : (
              <div className="text-primary">
                {Intl.NumberFormat(undefined, {
                  style: "percent",
                  maximumFractionDigits: 1,
                }).format(opportunity.apr / 100)}
              </div>
            )}
          </div>
        </button>
      </TooltipTrigger>
      {disabledReason && <TooltipContent>{disabledReason}</TooltipContent>}
    </Tooltip>
  )
}

const Metric: FC<
  PropsWithChildren<{ icon: ReactNode; tooltip: ReactNode; className?: string }>
> = ({ children, icon, tooltip, className }) => {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex shrink-0 items-center gap-2 self-start", className)}>
          <div className="shrink-0 align-text-bottom font-medium">{icon}</div>
          <div>{children ?? t("N/A")}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
