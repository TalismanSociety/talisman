import {
  GlobeIcon,
  ToolbarFilterIcon,
  ToolbarListIcon,
  ToolbarSortIcon,
  ToolbarTilesIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { t } from "i18next"
import { useAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuOptionItem,
  ContextMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useOpenClose,
} from "talisman-ui"

import { SearchInput } from "@talisman/components/SearchInput"
import { nftsVisibilityFilterAtom, NftVisibilityFilter } from "@ui/atoms"
import { useSetting } from "@ui/hooks/useSettings"
import { IS_POPUP } from "@ui/util/constants"

import { ChainLogo } from "../Asset/ChainLogo"
import { NetworkFilterModal } from "./NetworkFilterModal"
import { usePortfolioNftsNetwork, usePortfolioNftsSearch } from "./Nfts/usePortfolioNfts"
import { PortfolioToolbarButton } from "./PortfolioToolbarButton"

export const NftViewModeToggleButton = () => {
  const [viewMode, setViewMode] = useSetting("nftsViewMode")

  const handleViewModeClick = useCallback(
    () => setViewMode((prev) => (prev === "list" ? "tiles" : "list")),
    [setViewMode]
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <PortfolioToolbarButton onClick={handleViewModeClick}>
          {viewMode === "tiles" ? <ToolbarListIcon /> : <ToolbarTilesIcon />}
        </PortfolioToolbarButton>
      </TooltipTrigger>
      <TooltipContent>
        {viewMode === "list" ? t("Toggle to tiles view") : t("Toggle to list view")}
      </TooltipContent>
    </Tooltip>
  )
}

const NetworkFilterButton = () => {
  const { networks, networkFilter, setNetworkFilter } = usePortfolioNftsNetwork()
  const { isOpen, open, close } = useOpenClose()

  const networkIds = useMemo(() => networks.map((network) => network.id), [networks])

  const handleChange = useCallback(
    (networkId: string | null) => {
      setNetworkFilter(networks.find((n) => n.id === networkId))
      close()
    },
    [close, networks, setNetworkFilter]
  )

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <PortfolioToolbarButton
            onClick={open}
            className={classNames(networkFilter && "text-primary")}
          >
            {networkFilter ? (
              <ChainLogo className="text-lg" id={networkFilter.id} />
            ) : (
              <GlobeIcon />
            )}
          </PortfolioToolbarButton>
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
  const { search, setSearch } = usePortfolioNftsSearch()

  return (
    <SearchInput
      containerClassName={classNames(
        "!bg-field ring-grey-700 rounded-sm h-[3.6rem]",
        IS_POPUP ? "max-w-[17rem]" : "max-w-[37.4rem]"
      )}
      placeholder={t("Search")}
      onChange={setSearch}
      initialValue={search}
    />
  )
}

const VisibilityFilterButton = () => {
  const { t } = useTranslation()
  const [visibilityFilter, setVisibilityFilter] = useAtom(nftsVisibilityFilterAtom)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <PortfolioToolbarButton
                className={classNames(
                  visibilityFilter !== NftVisibilityFilter.Default && "text-primary"
                )}
              >
                <ToolbarFilterIcon />
              </PortfolioToolbarButton>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuOptionItem
                label={t("Default")}
                selected={visibilityFilter === NftVisibilityFilter.Default}
                onClick={() => setVisibilityFilter(NftVisibilityFilter.Default)}
              />
              <ContextMenuOptionItem
                label={t("Favorites")}
                selected={visibilityFilter === NftVisibilityFilter.Favorites}
                onClick={() => setVisibilityFilter(NftVisibilityFilter.Favorites)}
              />
              <ContextMenuOptionItem
                label={t("Hidden")}
                selected={visibilityFilter === NftVisibilityFilter.Hidden}
                onClick={() => setVisibilityFilter(NftVisibilityFilter.Hidden)}
              />
            </ContextMenuContent>
          </ContextMenu>
        </span>
      </TooltipTrigger>
      <TooltipContent>{t("Filter by property")}</TooltipContent>
    </Tooltip>
  )
}

export const SortByButton = () => {
  const { t } = useTranslation()
  const [sortBy, setSortBy] = useSetting("nftsSortBy")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <PortfolioToolbarButton>
                <ToolbarSortIcon />
              </PortfolioToolbarButton>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuOptionItem
                label={t("Last acquired")}
                selected={sortBy === "date"}
                onClick={() => setSortBy("date")}
              />
              <ContextMenuOptionItem
                label={t("Floor price")}
                selected={sortBy === "floor"}
                onClick={() => setSortBy("floor")}
              />
              <ContextMenuOptionItem
                label={t("Name")}
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

export const PortfolioToolbarNfts = () => {
  return (
    <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
      <div className="flex grow items-center overflow-hidden px-1">
        <PortfolioSearch />
      </div>
      <div className="flex shrink-0 gap-4">
        <NftViewModeToggleButton />
        <SortByButton />
        <VisibilityFilterButton />
        <NetworkFilterButton />
      </div>
    </div>
  )
}
