import { SearchInput } from "@talisman/components/SearchInput"
import { GlobeIcon, ToolbarListIcon, ToolbarTilesIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useSetting } from "@ui/hooks/useSettings"
import { t } from "i18next"
import { ButtonHTMLAttributes, DetailedHTMLProps, forwardRef, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { ChainLogo } from "../Asset/ChainLogo"
import { NetworkFilterModal } from "./NetworkPickerDialog"
import { usePortfolio, usePortfolioSearch } from "./usePortfolio"

const ToolbarButton = forwardRef<
  HTMLButtonElement,
  DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
>((props, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={classNames(
        "bg-grey-900 hover:bg-grey-800 text-body-secondary flex size-[3.6rem] items-center justify-center rounded-sm",
        "ring-body-disabled focus-visible:ring-1",
        props.className
      )}
    />
  )
})
ToolbarButton.displayName = "ToolbarButton"

const ViewModeToggleButton = () => {
  const [viewMode, setViewMode] = useSetting("nftsViewMode")

  const handleViewModeClick = useCallback(
    () => setViewMode((prev) => (prev === "list" ? "grid" : "list")),
    [setViewMode]
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ToolbarButton onClick={handleViewModeClick}>
          {viewMode === "list" ? <ToolbarListIcon /> : <ToolbarTilesIcon />}
        </ToolbarButton>
      </TooltipTrigger>
      <TooltipContent>
        {viewMode === "list" ? t("Toggle to grid view") : t("Toggle to list view")}
      </TooltipContent>
    </Tooltip>
  )
}

const NetworkFilterButton = () => {
  const { networks, networkFilter, setNetworkFilter } = usePortfolio()
  const { isOpen, open, close } = useOpenClose()

  const networkIds = useMemo(() => networks.map((network) => network.id), [networks])

  const handleChange = useCallback(
    (networkId: string | null) => {
      setNetworkFilter(networks.find((network) => network.id === networkId))
      close()
    },
    [close, networks, setNetworkFilter]
  )

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <ToolbarButton onClick={open} className={classNames(networkFilter && "text-primary")}>
            {networkFilter ? (
              <ChainLogo className="text-lg" id={networkFilter.id} />
            ) : (
              <GlobeIcon />
            )}
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipContent>
          {networkFilter ? networkFilter.name : t("Filter by network")}
        </TooltipContent>
      </Tooltip>
      <NetworkFilterModal
        onChange={handleChange}
        isOpen={isOpen}
        onClose={close}
        networkIds={networkIds}
        networkId={networkFilter?.id ?? null}
      />
    </>
  )
}

const PortfolioSearch = () => {
  const { t } = useTranslation()
  const { search, setSearch } = usePortfolioSearch()

  return (
    <SearchInput
      containerClassName="!bg-field ring-grey-700 rounded-sm max-w-[374rem] h-[3.6rem]"
      placeholder={t("Search")}
      onChange={setSearch}
      initialValue={search}
    />
  )
}

export const PortfolioToolbar = () => {
  return (
    <div className="flex w-full justify-between">
      <div>
        <PortfolioSearch />
      </div>
      <div className="flex gap-4">
        <ViewModeToggleButton />
        <NetworkFilterButton />
      </div>
    </div>
  )
}
