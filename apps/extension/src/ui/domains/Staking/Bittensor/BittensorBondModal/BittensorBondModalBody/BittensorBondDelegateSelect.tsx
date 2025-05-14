import { classNames } from "@talismn/util"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { ScrollContainerDraggableHorizontal } from "@talisman/components/ScrollContainerDraggableHorizontal"

import { BondOption as BondOptionType } from "../../../hooks/bittensor/types"
import { useCombinedBittensorValidatorsData } from "../../../hooks/bittensor/useCombinedBittensorValidatorsData"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorBondOption, BittensorBondOptionSkeleton } from "../BittensorBondOption"

type SortValue = "name" | "totalStaked" | "totalStakers" | "apr"

export type SortMethod = {
  label: string
  value: SortValue
  isDisabled?: boolean
}

const sortMethods: SortMethod[] = [
  { label: "Total Staked", value: "totalStaked" },
  { label: "Name", value: "name" },
  { label: "N° of Stakers", value: "totalStakers" },
  { label: "Rewards", value: "apr" },
]

export const BittensorBondDelegateSelect = () => {
  const { poolId, stakeType, setStep, setPoolId } = useBittensorBondWizard()
  const [selectedPoolId, setSelectedPoolId] = useState<number | string | null>(poolId)
  const [selectedSortMethod, setSelectedSortMethod] = useState<SortMethod>(sortMethods[0])
  const [sortedDelegators, setSortedDelegators] = useState<BondOptionType[]>([])

  const { t } = useTranslation()

  const {
    combinedValidatorsData,
    isLoading: combinedValidatorsDataLoading,
    isSupportedValidatorsError,
  } = useCombinedBittensorValidatorsData()

  const isLoading = useMemo(
    () => combinedValidatorsDataLoading && !sortedDelegators.length,
    [combinedValidatorsDataLoading, sortedDelegators.length],
  )

  const sortBondOptions = useCallback(
    (data: BondOptionType[], sortBy: SortValue): BondOptionType[] => {
      const sorted = data.sort((a, b) => {
        if (sortBy === "name") {
          // Sort by name in ascending order (A to Z)
          if (a.name < b.name) return -1
          if (a.name > b.name) return 1
        } else {
          // Sort other fields in descending order
          if (a[sortBy] > b[sortBy]) return -1
          if (a[sortBy] < b[sortBy]) return 1
        }
        return 0 // Keep them in the same place if equal
      })

      return sorted
    },
    [],
  )

  useEffect(() => {
    if (
      combinedValidatorsData.length &&
      !combinedValidatorsDataLoading &&
      !sortedDelegators.length
    ) {
      setSortedDelegators(sortBondOptions(combinedValidatorsData, sortMethods[0].value))
    }
  }, [
    combinedValidatorsData,
    combinedValidatorsDataLoading,
    sortBondOptions,
    sortedDelegators.length,
  ])

  const handleSortMethodChange = (method: SortMethod) => {
    setSelectedSortMethod(method)
    setSortedDelegators((prev) => sortBondOptions(prev, method.value))
  }

  const handleSelectPoolId = useCallback(
    (poolId: number | string) => {
      setSelectedPoolId(poolId)
    },
    [setSelectedPoolId],
  )

  const handleSubmit = useCallback(() => {
    if (selectedPoolId) {
      setPoolId(selectedPoolId)
      setStep(stakeType === "root" ? "form" : "subnet-form")
    }
  }, [selectedPoolId, setPoolId, setStep, stakeType])

  return (
    <div className="flex h-full flex-col gap-y-[16px] pt-8">
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
          <div>{t("Est. Rewards")}</div>
        </div>
        <ScrollContainer className="h-[34.5rem]" innerClassName="space-y-[0.8rem]">
          {isLoading && sortedDelegators.length === 0
            ? Array(6)
                .fill(null)
                .map((_, i) => {
                  return <BittensorBondOptionSkeleton key={i} isRecommended={i === 0} />
                })
            : sortedDelegators.map((option) => (
                <BittensorBondOption
                  key={option.poolId}
                  option={option}
                  selectedPoolId={selectedPoolId}
                  handleSelectPoolId={handleSelectPoolId}
                  tokenId={"bittensor-substrate-native"}
                />
              ))}
          {isSupportedValidatorsError && (
            <div className="text-alert-error flex h-full items-center justify-center">
              {t("Unable to fetch validators")}
            </div>
          )}
        </ScrollContainer>
      </div>
      <Button
        primary
        className="mt-auto w-full"
        onClick={handleSubmit}
        disabled={!selectedPoolId || selectedPoolId === poolId}
      >
        {t("Select Validator")}
      </Button>
    </div>
  )
}
