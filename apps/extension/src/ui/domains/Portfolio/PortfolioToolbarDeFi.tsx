import { FilterIcon, GlobeIcon } from "@talismn/icons"
import { SearchInput } from "@ui/components/SearchInput"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import type { ProtocolOption } from "@ui/state/defi"
import {
  setDefiProtocolFilter,
  useDefiPositions,
  useDefiProtocolFilterOption,
  useDefiProtocolFilterOptions,
} from "@ui/state/defi"
import type { NetworkOption } from "@ui/state/portfolio"
import {
  setPortfolioNetworkFilter,
  setPortfolioSearch,
  useAllNetworkOptions,
  usePortfolioNetworkFilter,
  usePortfolioSearch,
} from "@ui/state/portfolio"
import { classNames } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { t } from "i18next"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
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
    [close]
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
    [close]
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
        "h-16 w-full rounded-sm border border-field bg-field! px-4! text-xs ring-transparent focus-within:border-grey-700",
        "[&>button>svg]:size-10 [&>input]:text-sm [&>svg]:size-8",
        "@2xl:[&>input]:text-base @2xl:[&>svg]:size-10",
        IS_POPUP ? "w-full" : "max-w-93.5"
      )}
      placeholder={t("Search")}
      onChange={setPortfolioSearch}
      initialValue={search}
    />
  )
}

export const PortfolioToolbarDeFi = () => {
  return (
    <div className="@container flex h-16 w-full min-w-75 shrink-0 items-center justify-between gap-4 overflow-hidden">
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
