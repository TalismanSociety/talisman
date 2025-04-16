import { Icon } from "@iconify/react/dist/iconify.js"
import { PlusIcon } from "@talismn/icons"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Drawer, useOpenClose } from "talisman-ui"

import { RampCurrencyInfo } from "./currencyInfo"
import { RampCurrencyPicker } from "./RampCurrencyPicker"

// const CurrencyButtonContent: FC<{ code: string }> = ({ code }) => {
//   const currencyInfo = useCurrency

//   return (
//     <div className="flex items-center gap-4 truncate text-left">
//       <div className="flex-shrink-0">
//         <img
//           src={`https://assets.ramp.network/flags/${fiatCurrencyIfo.countryCode}.svg`}
//           alt={item.fiatCurrency}
//           className="h-[28px] w-[28px] rounded-full"
//         />
//       </div>
//       <div className="min-w-0 text-[16px]">
//         <div className="flex items-center">
//           <div className="text-white">{currency}</div>
//           {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
//         </div>
//         <div className="text-tiny truncate">{currency.currencyName}</div>
//       </div>
//       {onClear && (
//         <div onClick={onClear} role="button" tabIndex={0} onKeyDown={() => null}>
//           <XIcon className="shrink-0 text-[1.2em]" />
//         </div>
//       )}
//     </div>
//   )
// }

export const RampCurrencyPickerButton: FC<{
  value?: string
  currencies?: RampCurrencyInfo[]
  onSelect: (currency: string) => void
}> = ({ value, currencies, onSelect }) => {
  const [selected, setSelected] = useState(value)
  const { open, close, isOpen } = useOpenClose()

  const currency = useMemo(() => currencies?.find((c) => c.code === value), [value, currencies])

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
        className={
          "border-grey-750 bg-grey-800 flex h-full w-[14rem] items-center gap-4 rounded-[12px] px-4 py-3"
        }
      >
        {currency ? <CurrencyContent currency={currency} /> : <EmptyContent />}
      </button>
      <Drawer
        anchor="right"
        isOpen={isOpen}
        containerId="ramp-container"
        className="size-full bg-black"
      >
        <RampCurrencyPicker
          selected={selected}
          currencies={currencies}
          onClose={close}
          onSelect={handleSelect}
        />
      </Drawer>
    </>
  )
}

const CurrencyContent: FC<{ currency: RampCurrencyInfo }> = ({ currency }) => (
  <div className="flex items-center gap-4 truncate text-left">
    <div className="flex-shrink-0">
      <Icon icon={currency.icon} className="size-14 shrink-0" />
    </div>
    <div className="min-w-0 text-[16px]">
      <div className="text-white">{currency.code}</div>
      <div className="text-tiny truncate">{currency.currencyName}</div>
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
