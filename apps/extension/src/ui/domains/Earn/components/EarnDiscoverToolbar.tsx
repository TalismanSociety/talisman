import { ChevronDownIcon, FilterIcon, GlobeIcon, ToolbarSortIcon, XIcon } from "@talismn/icons"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuOptionItem,
  ContextMenuTrigger,
} from "@ui/components/ContextMenu"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/Popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkOptionsModal } from "@ui/domains/Portfolio/NetworkOptionsModal"
import { PortfolioToolbarButton } from "@ui/domains/Portfolio/PortfolioToolbarButton"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useTokensMap } from "@ui/state/chaindata"
import {
  type NetworkOption,
  setPortfolioNetworkFilter,
  useAllNetworkOptions,
  usePortfolioNetworkFilter,
} from "@ui/state/portfolio"
import { useSetting } from "@ui/state/settings"
import { useYieldxyzProviders } from "@ui/state/yieldxyz"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { useYieldxyzOpportunitiesByTokenId } from "../yieldxyz/hooks/useYieldxyzOpportunitiesByTokenId"
import { type ProtocolOption, ProtocolOptionsModal } from "./ProtocolOptionsModal"

const YIELD_TYPES = [
  { value: "staking", label: "Staking" },
  { value: "restaking", label: "Restaking" },
  { value: "lending", label: "Lending" },
  { value: "vault", label: "Vault" },
  { value: "fixed_yield", label: "Fixed Yield" },
  { value: "real_world_asset", label: "Real World Asset" },
  { value: "liquidity_pool", label: "LP" },
  { value: "concentrated_liquidity_pool", label: "Concentrated LP" },
] as const

const EarnDiscoverSortButton: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const [sortBy, setSortBy] = useSetting("earnDiscoverSortBy")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <PortfolioToolbarButton className={className}>
                <ToolbarSortIcon />
              </PortfolioToolbarButton>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuOptionItem
                label={t("Sort by Yield")}
                selected={sortBy === "yield"}
                onClick={() => setSortBy("yield")}
              />
              <ContextMenuOptionItem
                label={t("Sort by Token Name")}
                selected={sortBy === "name"}
                onClick={() => setSortBy("name")}
              />
            </ContextMenuContent>
          </ContextMenu>
        </span>
      </TooltipTrigger>
      <TooltipContent>{t("Sort")}</TooltipContent>
    </Tooltip>
  )
}

const EarnDiscoverFilterButton: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const [typeFilter, setTypeFilter] = useSetting("earnDiscoverTypeFilter")
  const [providerFilter, setProviderFilter] = useSetting("earnDiscoverProviderFilter")
  const { data: providers } = useYieldxyzProviders()
  const { data: allOpportunities } = useYieldxyzOpportunitiesByTokenId()
  const tokensMap = useTokensMap()
  const networkFilter = usePortfolioNetworkFilter() ?? null

  // Flatten all products, excluding those on filtered-out networks
  const allProducts = useMemo(() => {
    if (!allOpportunities) return []
    return allOpportunities.flatMap((opp) => {
      if (networkFilter) {
        const token = tokensMap[opp.tokenId]
        if (!token || !networkFilter.networkIds.includes(token.networkId)) return []
      }
      return opp.products
    })
  }, [allOpportunities, networkFilter, tokensMap])

  const availableTypes = useMemo(() => {
    const types = new Set<string>()
    for (const p of allProducts) types.add(p.mechanics.type)
    return types
  }, [allProducts])

  const availableProviderIds = useMemo(() => {
    const ids = new Set<string>()
    for (const p of allProducts) ids.add(p.providerId)
    return ids
  }, [allProducts])

  const availableYieldTypes = useMemo(
    () => YIELD_TYPES.filter(({ value }) => availableTypes.has(value)),
    [availableTypes]
  )

  const protocolProviders = useMemo(
    () =>
      (providers ?? [])
        .filter((p) => p.type === "protocol" && availableProviderIds.has(p.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [providers, availableProviderIds]
  )

  const protocolOptions: ProtocolOption[] = useMemo(
    () => protocolProviders.map((p) => ({ id: p.id, name: p.name, logoURI: p.logoURI })),
    [protocolProviders]
  )

  const selectedProtocol = useMemo(
    () => protocolProviders.find((p) => p.id === providerFilter),
    [protocolProviders, providerFilter]
  )

  const protocolModal = useOpenClose()

  const [popoverOpen, setPopoverOpen] = useState(false)
  const handlePopoverOpenChange = useCallback(
    (open: boolean) => {
      // Prevent popover from closing while the protocol modal is open
      if (!open && protocolModal.isOpen) return
      setPopoverOpen(open)
    },
    [protocolModal.isOpen]
  )

  const handleProtocolChange = useCallback(
    (item: ProtocolOption | null) => {
      setProviderFilter(item?.id || null)
      protocolModal.close()
    },
    [setProviderFilter, protocolModal.close]
  )

  // Auto-clear stale filter selections
  useEffect(() => {
    if (typeFilter && !availableTypes.has(typeFilter)) setTypeFilter(null)
  }, [typeFilter, availableTypes, setTypeFilter])

  useEffect(() => {
    if (providerFilter && !availableProviderIds.has(providerFilter)) setProviderFilter(null)
  }, [providerFilter, availableProviderIds, setProviderFilter])

  const hasActiveFilter = !!typeFilter || !!providerFilter

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Popover
            placement="bottom-start"
            open={popoverOpen}
            onOpenChange={handlePopoverOpenChange}
          >
            <PopoverTrigger asChild>
              <PortfolioToolbarButton
                className={cn(className, hasActiveFilter && "text-primary")}
                onClick={() => handlePopoverOpenChange(!popoverOpen)}
              >
                <FilterIcon />
              </PortfolioToolbarButton>
            </PopoverTrigger>
            <PopoverContent className="z-10 w-[20rem] rounded-sm border border-grey-800 bg-black p-8 shadow-lg">
              <div className="flex flex-col gap-6">
                <div className="text-body-secondary text-sm">{t("Type")}</div>
                <div className="grid grid-cols-2 gap-4">
                  {availableYieldTypes.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        "rounded border px-8 py-4 text-sm transition-colors",
                        typeFilter === value
                          ? "border-grey-800 bg-grey-800 text-primary"
                          : "border-grey-700 text-body-secondary hover:bg-grey-800"
                      )}
                      onClick={() => setTypeFilter(typeFilter === value ? null : value)}
                    >
                      {t(label)}
                    </button>
                  ))}
                </div>
                <div className="text-body-secondary text-sm">{t("Protocol")}</div>
                <button
                  type="button"
                  onClick={protocolModal.open}
                  className={cn(
                    "flex w-full items-center gap-8 rounded border border-grey-700 px-12 py-6 text-left text-sm transition-colors hover:border-grey-600 hover:text-grey-300",
                    selectedProtocol ? "text-body" : "text-body-secondary"
                  )}
                >
                  <span className="grow truncate">
                    {selectedProtocol?.name ?? t("Select Protocol")}
                  </span>
                  {selectedProtocol ? (
                    <XIcon
                      className="shrink-0 text-[1.2em] text-body-secondary hover:text-body"
                      onClick={(e) => {
                        e.stopPropagation()
                        setProviderFilter(null)
                      }}
                    />
                  ) : (
                    <ChevronDownIcon className="shrink-0 text-[1.2em] text-body-secondary" />
                  )}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </span>
      </TooltipTrigger>
      <TooltipContent>{t("Filter")}</TooltipContent>
      <ProtocolOptionsModal
        isOpen={protocolModal.isOpen}
        options={protocolOptions}
        selected={providerFilter ?? ""}
        onChange={handleProtocolChange}
        onClose={protocolModal.close}
      />
    </Tooltip>
  )
}

const EarnDiscoverNetworkFilterButton: FC<{
  className?: string
  networkFilter: NetworkOption | null
  networkOptions: NetworkOption[]
  onChange: (option: NetworkOption | null) => void
}> = ({ className, networkFilter, networkOptions, onChange }) => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  const handleChange = useCallback(
    (option: NetworkOption | null) => {
      onChange(option)
      close()
    },
    [onChange, close]
  )

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <PortfolioToolbarButton
            onClick={open}
            className={cn(className, networkFilter && "text-primary")}
          >
            {networkFilter ? (
              <NetworkLogo className="text-base" networkId={networkFilter.networkIds[0]} />
            ) : (
              <GlobeIcon />
            )}
          </PortfolioToolbarButton>
        </TooltipTrigger>
        <TooltipContent>
          {networkFilter ? networkFilter.name : t("Filter by network")}
        </TooltipContent>
      </Tooltip>
      <NetworkOptionsModal
        onChange={handleChange}
        isOpen={isOpen}
        onClose={close}
        options={networkOptions}
        selected={networkFilter}
      />
    </>
  )
}

export const EarnDiscoverToolbar: FC<{ buttonClassName?: string }> = ({ buttonClassName }) => {
  const allNetworkOptions = useAllNetworkOptions()
  const { data: allProducts } = useYieldxyzOpportunitiesByTokenId()
  const tokensMap = useTokensMap()
  const networkFilter = usePortfolioNetworkFilter() ?? null

  const setNetworkFilter = useCallback(
    (option: NetworkOption | null) => setPortfolioNetworkFilter(option ?? undefined),
    []
  )

  const discoverNetworkOptions = useMemo(() => {
    const networkIds = new Set(
      (allProducts ?? []).map((p) => tokensMap[p.tokenId]?.networkId).filter(Boolean) as string[]
    )
    return allNetworkOptions.filter((n) => n.networkIds.some((id) => networkIds.has(id)))
  }, [allNetworkOptions, allProducts, tokensMap])

  return (
    <div className="flex shrink-0 gap-2">
      <EarnDiscoverFilterButton className={buttonClassName} />
      <EarnDiscoverSortButton className={buttonClassName} />
      <EarnDiscoverNetworkFilterButton
        className={buttonClassName}
        networkFilter={networkFilter}
        networkOptions={discoverNetworkOptions}
        onChange={setNetworkFilter}
      />
    </div>
  )
}
