import { subNativeTokenId } from "@talismn/chaindata-provider"
import { ToolbarSortIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuOptionItem,
  ContextMenuTrigger,
} from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInputControlled } from "@talisman/components/SearchInputControlled"
import { type SubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/types"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"

import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BITTENSOR_TOKEN_ID } from "../../utils/constants"
import { BittensorStakingModalHeader } from "../BittensorModalHeader"
import { BittensorModalLayout } from "../BittensorModalLayout"
import { BittensorSubnetOption, BittensorSubnetOptionSkeleton } from "../BittensorSubnetOption"

type SortValue = "netuid" | "price" | "total_tao" | "total_alpha" | "emission"

const sortSubnetOptions = (data: SubnetData[], sortBy: SortValue): SubnetData[] => {
  const descendingFilters: SortValue[] = ["total_alpha", "total_tao", "emission"]
  const sorted = data.sort((a, b) => {
    if (descendingFilters.includes(sortBy)) {
      // Sort other fields in descending order
      if (Number(a[sortBy] || 0) > Number(b[sortBy] || 0)) return -1
      if (Number(a[sortBy] || 0) < Number(b[sortBy] || 0)) return 1

      return 0 // Keep them in the same place if equal
    } else {
      // Sort other fields in ascending order
      if (Number(a[sortBy] || 0) < Number(b[sortBy] || 0)) return -1
      if (Number(a[sortBy] || 0) > Number(b[sortBy] || 0)) return 1

      return 0 // Keep them in the same place if equal
    }
  })

  return sorted
}

export const BittensorSubnetSelect = () => {
  const { t } = useTranslation()
  const [search, setSearch] = useState<string>("")
  const [selectedSortMethod, setSelectedSortMethod] = useState<SortValue>("netuid") // netuid doesnt cause flickering
  const { setStep, setNetuid, netuid, networkId } = useBittensorBondWizard()

  const taoTokenId = useMemo(
    () => (networkId ? subNativeTokenId(networkId) : BITTENSOR_TOKEN_ID),
    [networkId],
  )

  const { subnetData, isError, isLoading, isSubnetsError, isSubnetsLoading } =
    useCombinedSubnetData()

  // removes rootnet from subnets
  const subnets = useMemo(
    () => Object.values(subnetData).filter((subnet) => subnet.netuid !== 0),
    [subnetData],
  )

  const [sortedOrFilteredSubnets, setSortedOrFilteredSubnets] = useState<SubnetData[] | undefined>(
    // check if data is available on first render, otherwise show loading state
    () => (subnets.length ? sortSubnetOptions(subnets, selectedSortMethod) : undefined),
  )

  useEffect(() => {
    if (!subnets.length) return
    const defaultFilteredSubnets: SubnetData[] = sortSubnetOptions(subnets, selectedSortMethod)
    setSortedOrFilteredSubnets(defaultFilteredSubnets)
  }, [selectedSortMethod, subnets])

  const handleSortMethodChange = useCallback(
    (method: SortValue) => {
      setSelectedSortMethod(method)
      setSortedOrFilteredSubnets(sortSubnetOptions(subnets, method))
    },
    [subnets],
  )

  const handleSearchClear = useCallback(() => {
    setSearch("")
    // restore selected sort method
    const filteredSubnets: SubnetData[] = sortSubnetOptions(subnets, selectedSortMethod)
    setSortedOrFilteredSubnets(filteredSubnets)
  }, [selectedSortMethod, subnets])

  const handleSearchChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const input = e.target.value
      setSearch(input)
      if (!input) {
        handleSearchClear()
      } else {
        setSortedOrFilteredSubnets(
          Object.values(subnets).filter((subnet) => {
            const { netuid, subnet_name, symbol } = subnet
            const subnetName = `${netuid} ${subnet_name} ${symbol}`.toLowerCase()
            return subnetName.includes(input.toLowerCase())
          }),
        )
      }
    },
    [handleSearchClear, subnets],
  )

  const handleSubmit = useCallback(
    (netuid: number) => {
      setNetuid(netuid)
      setStep("form")
    },
    [setNetuid, setStep],
  )

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          title={t("Select Subnet")}
          onBackClick={() => setStep("form")}
          withClose
        />
      }
    >
      <div className="flex size-full flex-col gap-8 overflow-hidden">
        <div className="flex items-center gap-4 px-12">
          <div className="grow">
            <SearchInputControlled
              containerClassName={classNames(
                "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-[3.6rem] grow border border-field text-sm !px-4 shrink-0",
                "[&>input]:text-sm [&>svg]:size-8 [&>button>svg]:size-10",
              )}
              placeholder={t("Search subnets")}
              value={search}
              onChange={handleSearchChange}
              onClear={handleSearchClear}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>
          <SortMethodButton method={selectedSortMethod} onChange={handleSortMethodChange} />
        </div>

        <div className="flex w-full grow flex-col gap-2 overflow-hidden">
          <div className="text-body-disabled flex justify-between pl-[6rem] pr-12 text-sm">
            <div>{t("Name / Pool")}</div>
            <div>{t("Emission / Alpha Price")}</div>
          </div>
          <ScrollContainer
            className="w-full grow"
            innerClassName="flex flex-col w-full bg-black-secondary"
          >
            {!networkId ||
            !sortedOrFilteredSubnets ||
            (isLoading && sortedOrFilteredSubnets.length === 0)
              ? Array(10)
                  .fill(null)
                  .map((_, i) => {
                    return <BittensorSubnetOptionSkeleton key={i} />
                  })
              : sortedOrFilteredSubnets.map((option) => (
                  <BittensorSubnetOption
                    key={option.netuid!}
                    option={option}
                    selectedNetuid={netuid}
                    networkId={networkId}
                    taoTokenId={taoTokenId}
                    handleSelectSubnet={handleSubmit}
                    isSubnetsLoading={isSubnetsLoading}
                    isSubnetsError={isSubnetsError}
                  />
                ))}
            {isError && (
              <div className="text-alert-error flex h-full items-center justify-center">
                {t("Unable to fetch subnets")}
              </div>
            )}
          </ScrollContainer>
        </div>
      </div>
    </BittensorModalLayout>
  )
}

const SortMethodButton: FC<{
  method: SortValue
  onChange: (method: SortValue) => void
}> = ({ method, onChange }) => {
  const { t } = useTranslation()

  const sortMethods = useMemo<{ label: string; value: SortValue }[]>(
    () => [
      { label: t("Alpha in Pool"), value: "total_alpha" },
      { label: t("TAO in Pool"), value: "total_tao" },
      { label: t("UID"), value: "netuid" },
      { label: t("Emission"), value: "emission" },
    ],
    [t],
  )

  const selected = useMemo(
    () => sortMethods.find((sortMethod) => sortMethod.value === method),
    [method, sortMethods],
  )

  return (
    <ContextMenu placement="bottom-end">
      <ContextMenuTrigger asChild>
        <button
          type="button"
          className="bg-field hover:bg-grey-800 text-body-secondary hover:text-grey-300 border-grey-850 flex h-full items-center gap-2 text-nowrap rounded-sm border px-[8px] py-[6px] text-sm"
        >
          <div>{selected?.label}</div>
          <ToolbarSortIcon className="size-10" />
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {sortMethods.map((sortMethod) => (
          <ContextMenuOptionItem
            key={sortMethod.value}
            label={t(sortMethod.label)}
            selected={sortMethod.value === method}
            onClick={() => onChange(sortMethod.value)}
          />
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}
