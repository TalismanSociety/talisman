import { Icon } from "@iconify/react/dist/iconify.js"
import { PlusIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Drawer, useOpenClose } from "talisman-ui"

import { getRampsCurrency, RampsCurrency } from "./currencies"
import { RampsCurrencyPicker } from "./RampsCurrencyPicker"

export const RampsCurrencyPickerButton: FC<{
  value?: string
  onSelect: (currency: string) => void
}> = ({ value, onSelect }) => {
  const [selected, setSelected] = useState(value)
  const { open, close, isOpen } = useOpenClose()

  const currency = useMemo(() => (value ? getRampsCurrency(value) : null), [value])

  const handleOpen = useCallback(() => {
    setSelected(value)
    open()
  }, [open, value])

  const handleSelect = useCallback(
    (currency: string) => {
      onSelect(currency)
      close()
    },
    [close, onSelect],
  )

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={classNames(
          "border-grey-750 bg-grey-800 focus-visible:border-grey-600 flex h-full w-[14rem] items-center gap-4 rounded-[12px] border px-4 py-3",
          "enabled:hover:bg-grey-750 disabled:opacity-50 disabled:grayscale",
        )}
      >
        {currency ? <CurrencyContent currency={currency} /> : <EmptyContent />}
      </button>
      <Drawer
        anchor="right"
        isOpen={isOpen}
        containerId="ramp-container"
        className="size-full bg-black"
      >
        <RampsCurrencyPicker selected={selected} onClose={close} onSelect={handleSelect} />
      </Drawer>
    </>
  )
}

const CurrencyContent: FC<{ currency: RampsCurrency }> = ({ currency }) => (
  <div className="flex items-center gap-4 truncate text-left">
    <div className="bg-body-disabled size-14 shrink-0 rounded-full">
      <Icon icon={currency.icon} className="size-14" />
    </div>
    <div className="min-w-0 text-[16px]">
      <div className="text-white">{currency.code}</div>
      <div className="text-tiny truncate">{currency.name}</div>
    </div>
  </div>
)

const EmptyContent: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full items-center gap-3">
      <div className="flex items-center justify-center rounded-full bg-[#D5FF5C] bg-opacity-10">
        <PlusIcon className="text-primary-500 m-[0.3rem] size-10" />
      </div>
      <div className="text-xs text-white">{t("Select currency")}</div>
    </div>
  )
}
