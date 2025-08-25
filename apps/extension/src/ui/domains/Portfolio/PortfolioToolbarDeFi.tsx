import { FilterIcon, GlobeIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { t } from "i18next"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { SearchInput } from "@talisman/components/SearchInput"
import {
  NetworkOption,
  ProtocolOption,
  setDefiProtocolFilter,
  setPortfolioNetworkFilter,
  setPortfolioSearch,
  useAllNetworkOptions,
  useDefiPositions,
  useDefiProtocolFilterOption,
  useDefiProtocolFilterOptions,
  usePortfolioNetworkFilter,
  usePortfolioSearch,
} from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { AssetLogo } from "../Asset/AssetLogo"
import { NetworkLogo } from "../Networks/NetworkLogo"
import { ProtocolOptionsModal } from "./DeFi/ProtocolFilterModal"
import { NetworkOptionsModal } from "./NetworkOptionsModal"
import { PortfolioToolbarButton } from "./PortfolioToolbarButton"

const DefiProtocolFilterButton = () => {
  const { isOpen, open, close } = useOpenClose()
  const protocolOptions = useDefiProtocolFilterOptions()
  const selectedOption = useDefiProtocolFilterOption()

  const handleChange = useCallback(
    (value: ProtocolOption | null) => {
      setDefiProtocolFilter(value?.name ?? null)
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
            className={classNames(selectedOption && "text-primary")}
          >
            {selectedOption?.logo ? (
              <AssetLogo className="text-lg" url={selectedOption?.logo} />
            ) : (
              <FilterIcon className="text-base" />
            )}
          </PortfolioToolbarButton>
        </TooltipTrigger>
        <TooltipContent>
          {selectedOption ? selectedOption.name : t("Filter by protocol")}
        </TooltipContent>
      </Tooltip>
      <ProtocolOptionsModal
        onChange={handleChange}
        isOpen={isOpen}
        onClose={close}
        options={protocolOptions}
        selected={selectedOption}
      />
    </>
  )
}

const NetworkFilterButton = () => {
  const allNetworkOptions = useAllNetworkOptions()
  const networkFilter = usePortfolioNetworkFilter()
  const { data: positions } = useDefiPositions()
  const { isOpen, open, close } = useOpenClose()

  const networkOptions = useMemo<NetworkOption[]>(() => {
    const networkIds = new Set(positions?.map((b) => b.networkId))
    return allNetworkOptions.filter((n) => n.networkIds.some((id) => networkIds.has(id)))
  }, [positions, allNetworkOptions])

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

export const PortfolioToolbarDeFi = () => {
  return (
    <div className="@container flex h-16 w-full min-w-[30rem] shrink-0 items-center justify-between gap-4 overflow-hidden">
      <div className="flex grow items-center overflow-hidden">
        <PortfolioSearch />
      </div>
      <div className="flex shrink-0 gap-4">
        <DefiProtocolFilterButton />
        <NetworkFilterButton />
      </div>
    </div>
  )
}
