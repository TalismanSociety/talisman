import { classNames } from "@talismn/util"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { ScrollContainerDraggableHorizontal } from "@talisman/components/ScrollContainerDraggableHorizontal"
import { SearchInput } from "@talisman/components/SearchInput"
import { type SubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/types"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"

import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { SubnetOption, SubnetOptionSkeleton } from "../SubnetOption"

type SortValue = "uid" | "price" | "taoInPool" | "alphaInPool" | "emission"

export type SortMethod = {
  label: string
  value: SortValue
  isDisabled?: boolean
}

const sortMethods: SortMethod[] = [
  { label: "UID", value: "uid" },
  { label: "Price", value: "price" },
  { label: "Emission", value: "emission" },
  { label: "TAO in Pool", value: "taoInPool" },
  { label: "Alpha in Pool", value: "alphaInPool" },
]

export const BittensorSubnetSelect = () => {
  const [search, setSearch] = useState<string>("")
  const [selectedSortMethod, setSelectedSortMethod] = useState<SortMethod>(sortMethods[0])
  const [sortedSubnets, setSortedSubnets] = useState<SubnetData[]>([])
  const { setStep, setNetuid, netuid } = useBittensorBondWizard()
  const [selectedNetuid, setSelectedNetuid] = useState<number | null>(netuid)

  const { t } = useTranslation()

  const { subnetData, isError, isLoading } = useCombinedSubnetData()

  useEffect(
    () => setSortedSubnets(Object.values(subnetData).filter((subnet) => subnet.netuid !== 0)),
    [subnetData],
  )

  const onSearchChange = (input: string) => {
    setSearch(input)
  }

  // const sortSubnetOptions = useCallback((data: SubnetData[], sortBy: SortValue): SubnetData[] => {
  //   // const sorted = data.sort((a, b) => {
  //   //   // Sort other fields in descending order
  //   //   if (a[sortBy] > b[sortBy]) return -1
  //   //   if (a[sortBy] < b[sortBy]) return 1
  //   //   return 0 // Keep them in the same place if equal
  //   // })
  //   const sorted = data

  //   return sorted
  // }, [])

  const handleSortMethodChange = (method: SortMethod) => {
    setSelectedSortMethod(method)
    // setSortedSubnets((prev) => sortSubnetOptions(prev, method.value))
  }

  const handleSubmit = () => {
    setStep("subnet-form")
    if (selectedNetuid) {
      setNetuid(selectedNetuid)
    }
  }

  return (
    <div className="flex h-full flex-col gap-y-[16px] pt-8">
      <SearchInput
        containerClassName={classNames(
          "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-[3.6rem] w-full border border-field text-sm !px-4",
          "[&>input]:text-sm [&>svg]:size-8 [&>button>svg]:size-10",
          "@2xl:h-[4.4rem] @2xl:[&>input]:text-base @2xl:[&>svg]:size-10",
        )}
        placeholder={t("Search account or folder")}
        onChange={onSearchChange}
        initialValue={search}
      />
      <ScrollContainerDraggableHorizontal className="flex justify-between gap-2">
        {sortMethods.map((method) => (
          <button
            key={method.label}
            onClick={() => !isLoading && !method.isDisabled && handleSortMethodChange(method)}
            className={classNames(
              "text-nowrap rounded-[12px] px-[8px] py-[6px] text-sm",
              method.value === selectedSortMethod.value
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
          <div>{t("24h change")}</div>
        </div>
        <ScrollContainer className="h-[29.5rem]" innerClassName="space-y-[0.8rem]">
          {isLoading && sortedSubnets.length === 0
            ? Array(6)
                .fill(null)
                .map((_, i) => {
                  return <SubnetOptionSkeleton key={i} />
                })
            : sortedSubnets.map((option) => (
                <SubnetOption
                  key={option.netuid!}
                  option={option}
                  selectedNetuid={selectedNetuid}
                  tokenId="bittensor-substrate-native"
                  handleSelectSubnet={setSelectedNetuid}
                />
              ))}
          {isError && (
            <div className="text-alert-error ite`ms-center flex h-full justify-center">
              {t("Unable to fetch subnets")}
            </div>
          )}
        </ScrollContainer>
      </div>
      <Button primary className="mt-auto w-full" onClick={handleSubmit} disabled={!selectedNetuid}>
        {t("Select Subnet")}
      </Button>
    </div>
  )
}
