import { ChevronLeftIcon, SettingsIcon, UserRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer, IconButton, useOpenClose } from "talisman-ui"

import { Tokens } from "@ui/domains/Asset/Tokens"

export type SortMethod = {
  label: string
  value: string
}

export type BondOption = {
  poolId: number | string
  name: string
  apr: number
  totalStaked: number
  totalStakers: number
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
}

export const BondSelectDrawer: FC<BondSelectDrawerProps> = ({
  poolName,
  sortMethods,
  selectedSortMethod,
  handleSortMethodChange,
  handleSelectPoolId,
  handleSubmitPoolId,
  bondOptions,
  tokenSymbol,
  selectedPoolId,
}) => {
  const { close, isOpen, toggle } = useOpenClose()
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
                {bondOptions.map((option) => (
                  <button
                    key={option.poolId}
                    onClick={() => handleSelectPoolId(option.poolId)}
                    className={classNames(
                      "bg-black-tertiary text-body-disabled border-black-tertiary flex w-full flex-col gap-[10px] rounded-sm border-[1px] p-[12px] text-xs",
                      option.poolId === selectedPoolId && "border-grey-400",
                    )}
                  >
                    <div
                      className={classNames(
                        "text-sm font-bold",
                        option.poolId === selectedPoolId && "text-white",
                      )}
                    >
                      {option.name}
                    </div>
                    <div className="flex w-full justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4">
                          <Tokens amount={option.totalStaked} symbol={tokenSymbol} />
                          {t("staked")}
                        </div>
                        <div className="bg-grey-600 h-[4px] w-[4px] rounded-full" />
                        <div className="flex gap-4">
                          {/* TODO: Add correct icon */}
                          {option.totalStakers} <UserRightIcon />
                        </div>
                      </div>
                      <div className="ml-auto">{option.apr}%</div>
                    </div>
                  </button>
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
