import { isAddressEqual, normalizeAddress } from "@talismn/crypto"
import { GlobeIcon, LayersIcon, ToolbarSortIcon } from "@talismn/icons"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuOptionItem,
  ContextMenuTrigger,
} from "@ui/components/ContextMenu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useEarnPositions } from "@ui/domains/Earn/hooks/useEarnPositions"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkOptionsModal } from "@ui/domains/Portfolio/NetworkOptionsModal"
import { PortfolioToolbarButton } from "@ui/domains/Portfolio/PortfolioToolbarButton"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import {
  type NetworkOption,
  setPortfolioNetworkFilter,
  useAllNetworkOptions,
  usePortfolioNetworkFilter,
} from "@ui/state/portfolio"
import { useSetting } from "@ui/state/settings"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

const EarnPositionsSortButton: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const [sortBy, setSortBy] = useSetting("earnPositionsSortBy")

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
                label={t("Sort by Balance")}
                selected={sortBy === "total"}
                onClick={() => setSortBy("total")}
              />
              <ContextMenuOptionItem
                label={t("Sort by Name")}
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

const EarnPositionsGroupByButton: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const [groupBy, setGroupBy] = useSetting("earnPositionsGroupBy")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <PortfolioToolbarButton className={className}>
                <LayersIcon />
              </PortfolioToolbarButton>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuOptionItem
                label={t("No Grouping")}
                selected={groupBy === "none"}
                onClick={() => setGroupBy("none")}
              />
              <ContextMenuOptionItem
                label={t("Token")}
                selected={groupBy === "token"}
                onClick={() => setGroupBy("token")}
              />
              <ContextMenuOptionItem
                label={t("Network")}
                selected={groupBy === "network"}
                onClick={() => setGroupBy("network")}
              />
            </ContextMenuContent>
          </ContextMenu>
        </span>
      </TooltipTrigger>
      <TooltipContent>{t("Group by")}</TooltipContent>
    </Tooltip>
  )
}

const EarnPositionsNetworkFilterButton: FC<{
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

export const EarnPositionsToolbar: FC<{ buttonClassName?: string }> = ({ buttonClassName }) => {
  const allNetworkOptions = useAllNetworkOptions()
  const { data: earnPositions } = useEarnPositions()
  const { selectedAccounts } = usePortfolioNavigation()
  const networkFilter = usePortfolioNetworkFilter() ?? null

  const setNetworkFilter = useCallback(
    (option: NetworkOption | null) => setPortfolioNetworkFilter(option ?? undefined),
    []
  )

  const positionNetworkOptions = useMemo(() => {
    const accountAddresses = selectedAccounts.map((acc) => normalizeAddress(acc.address))
    const accountPositions = (earnPositions ?? []).filter((p) =>
      accountAddresses.some((addr) => isAddressEqual(addr, p.address))
    )
    const networkIds = new Set(accountPositions.map((p) => p.networkId).filter(Boolean) as string[])
    return allNetworkOptions.filter((n) => n.networkIds.some((id) => networkIds.has(id)))
  }, [allNetworkOptions, earnPositions, selectedAccounts])

  return (
    <div className="flex shrink-0 gap-2">
      <EarnPositionsGroupByButton className={buttonClassName} />
      <EarnPositionsSortButton className={buttonClassName} />
      <EarnPositionsNetworkFilterButton
        className={buttonClassName}
        networkFilter={networkFilter}
        networkOptions={positionNetworkOptions}
        onChange={setNetworkFilter}
      />
    </div>
  )
}
