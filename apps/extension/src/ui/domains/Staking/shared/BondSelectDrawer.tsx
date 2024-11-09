import { ChevronLeftIcon, SettingsIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer, IconButton } from "talisman-ui"

import { BondOption } from "../hooks/bittensor/types"
import { BondDrawerOption, BondDrawerOptionSkeleton } from "./BondDrawerOption"

export type SortMethod = {
  label: string
  value: string
}

type BondSelectDrawerProps = {
  poolName: string
  sortMethods: SortMethod[]
  selectedSortMethod: SortMethod
  handleSortMethodChange: (method: SortMethod) => void
  handleSubmitPoolId: () => void
  handleSelectPoolId: React.Dispatch<React.SetStateAction<number | string | null | undefined>>
  bondOptions: BondOption[]
  tokenSymbol: string
  selectedPoolId?: number | string | null | undefined
  close: () => void
  isOpen: boolean
  toggle: () => void
  isLoading: boolean
}

export const BondSelectDrawer: FC<BondSelectDrawerProps> = ({
  poolName,
  sortMethods,
  selectedSortMethod,
  bondOptions,
  tokenSymbol,
  selectedPoolId,
  isOpen,
  isLoading,
  handleSortMethodChange,
  handleSelectPoolId,
  handleSubmitPoolId,
  close,
  toggle,
}) => {
  const { t } = useTranslation()

  return (
    <div>
      <button
        onClick={toggle}
        className="bg-pill flex items-center gap-2 rounded-xl p-4 text-xs font-light"
      >
        <SettingsIcon className="text-body-secondary" />
        <div>{poolName}</div>
      </button>
      <Drawer
        anchor={"bottom"}
        containerId="main"
        isOpen={isOpen}
        onDismiss={close}
        className="z-50"
      >
        <div className="border-grey-850 bg-black-secondary flex min-h-[96vh] w-full max-w-[74rem] flex-col gap-8 rounded-t-xl border-t py-12">
          <div className="flex items-center px-8">
            <IconButton onClick={close}>
              <ChevronLeftIcon />
            </IconButton>
            <div className="text-md text-body font-bold">{t("Select a validator")}</div>
          </div>

          <div className="flex flex-col gap-8 px-12">
            <div className="flex justify-between">
              {sortMethods.map((method) => (
                <button
                  key={method.value}
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

            <div className="text-body-disabled flex justify-between text-sm">
              <div>{t("Name")}</div>
              <div>{t("Est. Rewards")}</div>
            </div>
            <div className="h-full max-h-[56vh] overflow-scroll bg-blue-500">
              <div className="space-y-[1rem]">
                {isLoading && bondOptions.length === 0
                  ? Array(5)
                      .fill(null)
                      .map((_, i) => <BondDrawerOptionSkeleton key={i} />)
                  : bondOptions.map((option) => (
                      <BondDrawerOption
                        key={option.poolId}
                        option={option}
                        selectedPoolId={selectedPoolId}
                        handleSelectPoolId={handleSelectPoolId}
                        tokenSymbol={tokenSymbol}
                      />
                    ))}
              </div>
            </div>
          </div>
          <Button
            primary
            className="mx-12 mt-auto"
            onClick={() => {
              handleSubmitPoolId()
              close()
            }}
          >
            Select
          </Button>
        </div>
      </Drawer>
    </div>
  )
}
