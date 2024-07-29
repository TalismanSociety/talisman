import { GlobeIcon, ToolbarSortIcon } from "@talismn/icons"
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
import { useSetting } from "@ui/hooks/useSettings"
import { IS_POPUP } from "@ui/util/constants"

import { ChainLogo } from "../Asset/ChainLogo"
import { NetworkFilterModal } from "./NetworkFilterModal"
import { PortfolioToolbarButton } from "./PortfolioToolbarButton"
import { usePortfolio, usePortfolioSearch } from "./usePortfolio"

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
  const { search, setSearch } = usePortfolioSearch()

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

const TokensSortButton = () => {
  const { t } = useTranslation()
  const [sortBy, setSortBy] = useSetting("tokensSortBy")

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
                label={t("Total")}
                selected={sortBy === "total"}
                onClick={() => setSortBy("total")}
              />
              <ContextMenuOptionItem
                label={t("Available")}
                selected={sortBy === "available"}
                onClick={() => setSortBy("available")}
              />
              <ContextMenuOptionItem
                label={t("Locked")}
                selected={sortBy === "locked"}
                onClick={() => setSortBy("locked")}
              />
              <ContextMenuOptionItem
                label={t("Symbol")}
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

export const PortfolioToolbarTokens = () => {
  return (
    <div className="flex w-full items-center justify-between gap-8 overflow-hidden">
      <div className="flex grow items-center overflow-clip px-1">
        <PortfolioSearch />
      </div>
      <div className="flex shrink-0 gap-4">
        {!IS_POPUP && <TokensSortButton />}
        <NetworkFilterButton />
      </div>
    </div>
  )
}
