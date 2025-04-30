import { classNames } from "@talismn/util"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { ScrollContainerDraggableHorizontal } from "@talisman/components/ScrollContainerDraggableHorizontal"

import { BondOption as BondOptionType } from "../../../../hooks/bittensor/types"
import { useBittensorBondWizard } from "../../../hooks/useBittensorBondWizard"
import { BondOption, BondOptionSkeleton } from "./BondOption"

export type SortMethod<T> = {
  label: string
  value: T
  isDisabled?: boolean
}

type BondDelegateSelectProps<T> = {
  sortMethods: SortMethod<T>[]
  selectedSortMethod: SortMethod<T>
  handleSortMethodChange: (method: SortMethod<T>) => void
  bondOptions: BondOptionType[]
  tokenId: string
  isLoading: boolean
  isError: boolean
}

export const BondDelegateSelect = <T,>({
  sortMethods,
  handleSortMethodChange,
  selectedSortMethod,
  isLoading,
  bondOptions,
  tokenId,
  isError,
}: BondDelegateSelectProps<T>) => {
  const { poolId, stakeType, setStep, setPoolId, setIsDefaultOption } = useBittensorBondWizard()
  const [selectedPoolId, setSelectedPoolId] = useState<number | string | null>(poolId)
  const { t } = useTranslation()

  const handleSelectPoolId = useCallback(
    (poolId: number | string) => {
      setSelectedPoolId(poolId)
    },
    [setSelectedPoolId],
  )

  const handleSubmit = useCallback(() => {
    if (selectedPoolId) {
      setPoolId(selectedPoolId)
      setIsDefaultOption(false)
      setStep(stakeType === "root" ? "form" : "subnet-form")
    }
  }, [selectedPoolId, setIsDefaultOption, setPoolId, setStep, stakeType])

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
          {isLoading && bondOptions.length === 0
            ? Array(6)
                .fill(null)
                .map((_, i) => {
                  return <BondOptionSkeleton key={i} isRecommended={i === 0} />
                })
            : bondOptions.map((option) => (
                <BondOption
                  key={option.poolId}
                  option={option}
                  selectedPoolId={selectedPoolId}
                  handleSelectPoolId={handleSelectPoolId}
                  tokenId={tokenId}
                />
              ))}
          {isError && (
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
