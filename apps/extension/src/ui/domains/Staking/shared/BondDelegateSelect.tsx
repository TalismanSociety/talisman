import { classNames } from "@talismn/util"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { useBondWizard } from "../Bond/useBondWizard"
import { BondOption as BondOptionType } from "../hooks/bittensor/types"
import { BondOption, BondOptionSkeleton } from "./BondOption"

export type SortMethod<T> = {
  label: string
  value: T
}

type BondDelegateSelectProps<T> = {
  sortMethods: SortMethod<T>[]
  selectedSortMethod: SortMethod<T>
  handleSortMethodChange: (method: SortMethod<T>) => void
  bondOptions: BondOptionType[]
  tokenId: string
  isLoading: boolean
}

export const BondDelegateSelect = <T,>({
  sortMethods,
  handleSortMethodChange,
  selectedSortMethod,
  isLoading,
  bondOptions,
  tokenId,
}: BondDelegateSelectProps<T>) => {
  const { setStep, setPoolId, poolId } = useBondWizard()
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col gap-y-[16px] pt-10">
      <div className="flex justify-between">
        {sortMethods.map((method) => (
          <button
            key={method.label}
            onClick={() => handleSortMethodChange(method)}
            className={classNames(
              "rounded-[12px] px-[8px] py-[6px] text-sm",
              method.value === selectedSortMethod.value
                ? "bg-primary-500 text-black"
                : "bg-black-tertiary text-grey-400",
            )}
          >
            {t(method.label)}
          </button>
        ))}
      </div>
      <div className="space-y-[8px]">
        <div className="text-body-disabled flex justify-between px-[10px] text-sm">
          <div>{t("Name")}</div>
          <div>{t("Est. Rewards")}</div>
        </div>
        <div className="bg-[blue]-500 h-[36rem] space-y-[1rem] overflow-y-scroll">
          {isLoading && bondOptions.length === 0
            ? Array(6)
                .fill(null)
                .map((_, i) => <BondOptionSkeleton key={i} />)
            : bondOptions.map((option) => (
                <BondOption
                  key={option.poolId}
                  option={option}
                  selectedPoolId={poolId}
                  handleSelectPoolId={setPoolId}
                  tokenId={tokenId}
                />
              ))}
        </div>
      </div>
      <Button primary className="mt-auto w-full" onClick={() => setStep("form")}>
        {t("Continue")}
      </Button>
    </div>
  )
}
