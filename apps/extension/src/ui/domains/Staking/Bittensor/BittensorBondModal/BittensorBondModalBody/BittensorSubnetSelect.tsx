import { classNames } from "@talismn/util"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { ScrollContainerDraggableHorizontal } from "@talisman/components/ScrollContainerDraggableHorizontal"
import { SearchInputControlled } from "@talisman/components/SearchInputControlled"
import { type SubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/types"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"

import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorSubnetOption, BittensorSubnetOptionSkeleton } from "../BittensorSubnetOption"

type SortValue = "netuid" | "price" | "total_tao" | "total_alpha" | "emission"

export type SortMethod = {
  label: string
  value: SortValue
  isDisabled?: boolean
}

const sortMethods: SortMethod[] = [
  { label: "Alpha in Pool", value: "total_alpha" },
  { label: "TAO in Pool", value: "total_tao" },
  { label: "UID", value: "netuid" },
  { label: "Emission", value: "emission" },
  // { label: "Price", value: "price" },
]

export const BittensorSubnetSelect = () => {
  const [search, setSearch] = useState<string>("")
  const [selectedSortMethod, setSelectedSortMethod] = useState<SortMethod>(sortMethods[0])
  const [sortedOrFilteredSubnets, setSortedOrFilteredSubnets] = useState<SubnetData[]>([])
  const { setStep, setNetuid, netuid } = useBittensorBondWizard()
  const [selectedNetuid, setSelectedNetuid] = useState<number | null>(netuid)

  const { t } = useTranslation()

  const { subnetData, isError, isLoading, isSubnetsError, isSubnetsLoading } =
    useCombinedSubnetData()

  // removes rootnet from subnets
  const subnets = useMemo(
    () => Object.values(subnetData).filter((subnet) => subnet.netuid !== 0),
    [subnetData],
  )

  const sortSubnetOptions = useCallback((data: SubnetData[], sortBy: SortValue): SubnetData[] => {
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
  }, [])

  useEffect(() => {
    const defaultFilteredSubnets: SubnetData[] = sortSubnetOptions(subnets, sortMethods[0].value)
    setSortedOrFilteredSubnets(defaultFilteredSubnets)
  }, [sortSubnetOptions, subnets])

  const handleSortMethodChange = useCallback(
    (method: SortMethod) => {
      setSearch("") // clear search
      setSelectedSortMethod(method)
      setSortedOrFilteredSubnets(sortSubnetOptions(subnets, method.value))
    },
    [sortSubnetOptions, subnets],
  )

  const handleSearchClear = useCallback(() => {
    setSearch("")
    // restore selected sort method
    const filteredSubnets: SubnetData[] = sortSubnetOptions(subnets, selectedSortMethod.value)
    setSortedOrFilteredSubnets(filteredSubnets)
  }, [selectedSortMethod.value, sortSubnetOptions, subnets])

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

  const handleSubmit = useCallback(() => {
    setStep("subnet-form")
    if (selectedNetuid) {
      setNetuid(selectedNetuid)
    }
  }, [selectedNetuid, setNetuid, setStep])

  return (
    <div className="flex h-full flex-col gap-y-[16px] pt-8">
      <SearchInputControlled
        containerClassName={classNames(
          "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-[3.6rem] w-full border border-field text-sm !px-4",
          "[&>input]:text-sm [&>svg]:size-8 [&>button>svg]:size-10",
          "@2xl:h-[4.4rem] @2xl:[&>input]:text-base @2xl:[&>svg]:size-10",
        )}
        placeholder={t("Search for subnet name or number")}
        value={search}
        onChange={handleSearchChange}
        onClear={handleSearchClear}
        isDisabled={isLoading || subnets.length === 0}
      />
      <ScrollContainerDraggableHorizontal className="flex justify-between gap-2">
        {sortMethods.map((method) => (
          <button
            key={method.label}
            onClick={() => !isLoading && !method.isDisabled && handleSortMethodChange(method)}
            className={classNames(
              "text-nowrap rounded-[12px] px-[8px] py-[6px] text-sm",
              method.value === selectedSortMethod.value && !search
                ? "bg-primary-500 text-black"
                : "bg-black-tertiary text-grey-400",
              (isLoading || method.isDisabled) && "cursor-not-allowed",
            )}
          >
            {t(method.label)}
          </button>
        ))}
      </ScrollContainerDraggableHorizontal>
      <div className="space-y-[8px]">
        <div className="text-body-disabled flex justify-between px-[10px] text-sm">
          <div>{t("Name")}</div>
          <div>{t("Emission")}</div>
        </div>
        <ScrollContainer className="h-[29.5rem]" innerClassName="space-y-[0.8rem]">
          {isLoading && sortedOrFilteredSubnets.length === 0
            ? Array(6)
                .fill(null)
                .map((_, i) => {
                  return <BittensorSubnetOptionSkeleton key={i} />
                })
            : sortedOrFilteredSubnets.map((option) => (
                <BittensorSubnetOption
                  key={option.netuid!}
                  option={option}
                  selectedNetuid={selectedNetuid}
                  tokenId="bittensor-substrate-native"
                  handleSelectSubnet={setSelectedNetuid}
                  isSubnetsLoading={isSubnetsLoading}
                  isSubnetsError={isSubnetsError}
                />
              ))}
          {isError && (
            <div className="text-alert-error ite`ms-center flex h-full justify-center">
              {t("Unable to fetch subnets")}
            </div>
          )}
        </ScrollContainer>
      </div>
      <Button
        primary
        className="mt-auto w-full"
        onClick={handleSubmit}
        disabled={!selectedNetuid || selectedNetuid === netuid}
      >
        {t("Select Subnet")}
      </Button>
    </div>
  )
}
