import { SearchInput } from "@talisman/components/SearchInput"
import { GlobeIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { t } from "i18next"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { ChainLogo } from "../Asset/ChainLogo"
import { NetworkFilterModal } from "./NetworkPickerDialog"
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
        "!bg-field ring-grey-700 rounded-sm h-[3.6rem] max-w-[37.4rem]"
        //"outline outline-orange"
        // IS_POPUP ? "max-w-[20rem]" : ""
      )}
      placeholder={t("Search")}
      onChange={setSearch}
      initialValue={search}
    />
  )
}

export const PortfolioToolbarTokens = () => {
  return (
    <div className="flex w-full items-center justify-between gap-8 overflow-hidden">
      <div className="-mx-1 flex grow items-center overflow-clip px-1">
        <PortfolioSearch />
      </div>
      <div className="flex shrink-0 gap-4">
        <NetworkFilterButton />
      </div>
    </div>
  )
}
