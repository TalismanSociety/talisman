import {
  GlobeIcon,
  ToolbarFilterIcon,
  ToolbarListIcon,
  ToolbarSortIcon,
  ToolbarTilesIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { t } from "i18next"
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
import {
  NetworkOption,
  NftVisibilityFilter,
  setNftsVisibilityFilter,
  setPortfolioNetworkFilter,
  setPortfolioSearch,
  useAllNetworkOptions,
  useNftData,
  useNftsVisibilityFilter,
  usePortfolioNetworkFilter,
  usePortfolioSearch,
  useSetting,
} from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { NetworkLogo } from "../Networks/NetworkLogo"
import { NetworkOptionsModal } from "./NetworkOptionsModal"
import { PortfolioToolbarButton } from "./PortfolioToolbarButton"

export const NftViewModeToggleButton = () => {
  const [viewMode, setViewMode] = useSetting("nftsViewMode")

  const handleViewModeClick = useCallback(
    () => setViewMode((prev) => (prev === "list" ? "tiles" : "list")),
    [setViewMode],
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
  const allNetworkOptions = useAllNetworkOptions()
  const networkFilter = usePortfolioNetworkFilter()
  const { nfts } = useNftData()
  const { isOpen, open, close } = useOpenClose()

  const networkOptions = useMemo<NetworkOption[]>(() => {
    const networkIds = new Set(nfts.map((n) => n.networkId))
    return allNetworkOptions.filter((n) => n.networkIds.some((id) => networkIds.has(id)))
  }, [nfts, allNetworkOptions])

  const handleChange = useCallback(
    (option: NetworkOption | null) => {
      setPortfolioNetworkFilter(option ?? undefined)
      close()
    },
    [close],
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
              <NetworkLogo className="text-lg" networkId={networkFilter.networkIds[0]} />
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
        selected={networkFilter ?? null}
      />
    </>
  )
}

const PortfolioSearch = () => {
  const { t } = useTranslation()
  const search = usePortfolioSearch()

  return (
    <SearchInput
      containerClassName={classNames(
        "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-16 w-full border border-field text-xs !px-4",
        "[&>input]:text-sm [&>svg]:size-8 [&>button>svg]:size-10",
        "@2xl:[&>input]:text-base @2xl:[&>svg]:size-10",
        IS_POPUP ? "w-full" : "max-w-[37.4rem]",
      )}
      placeholder={t("Search")}
      onChange={setPortfolioSearch}
      initialValue={search}
    />
  )
}

const VisibilityFilterButton = () => {
  const { t } = useTranslation()
  const nftsVisibilityFilter = useNftsVisibilityFilter()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <PortfolioToolbarButton
                className={classNames(
                  nftsVisibilityFilter !== NftVisibilityFilter.Default && "text-primary",
                )}
              >
                <ToolbarFilterIcon />
              </PortfolioToolbarButton>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuOptionItem
                label={t("Default")}
                selected={nftsVisibilityFilter === NftVisibilityFilter.Default}
                onClick={() => setNftsVisibilityFilter(NftVisibilityFilter.Default)}
              />
              <ContextMenuOptionItem
                label={t("Favorites")}
                selected={nftsVisibilityFilter === NftVisibilityFilter.Favorites}
                onClick={() => setNftsVisibilityFilter(NftVisibilityFilter.Favorites)}
              />
              <ContextMenuOptionItem
                label={t("Hidden")}
                selected={nftsVisibilityFilter === NftVisibilityFilter.Hidden}
                onClick={() => setNftsVisibilityFilter(NftVisibilityFilter.Hidden)}
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
                label={t("Date")}
                selected={sortBy === "date"}
                onClick={() => setSortBy("date")}
              />
              <ContextMenuOptionItem
                label={t("Value")}
                selected={sortBy === "value"}
                onClick={() => setSortBy("value")}
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
    <div className="@container flex h-16 w-full min-w-[30rem] shrink-0 items-center justify-between gap-4 overflow-hidden">
      <div className="flex grow items-center overflow-hidden">
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
