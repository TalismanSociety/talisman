import { XIcon } from "@talismn/icons"
import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

import { OptionSwitch } from "@talisman/components/OptionSwitch"
import { useSelectedCurrency } from "@ui/state"

import { RampsBuyForm } from "./buy/RampsBuyForm"
import { useRampsBuyTokens } from "./buy/useRampsBuyTokens"
import { RampsSellForm } from "./sell/RampsSellForm"
import { useRampsSellTokens } from "./sell/useRampsSellTokens"
import { getRampsCurrency } from "./shared/currencies"
import { RampsFormSharedData } from "./shared/types"
import { useRampsModal } from "./useRampsModal"

type FormMode = "buy" | "sell"

type FormDefaults = RampsFormSharedData & {
  mode: FormMode
}

// @dev: can use this to prefill the form when debugging
const DEFAULT_FORM_VALUE: FormDefaults = {
  mode: "buy",
  // currencyCode: "USD",
  // tokenId: "1-evm-native",
}

export const RampsFormRouter = () => {
  const selectedCurrency = useSelectedCurrency()
  const { close } = useRampsModal()

  const [defaults, setDefaults] = useState(() => {
    if (DEFAULT_FORM_VALUE.currencyCode) return DEFAULT_FORM_VALUE
    // if user's current currency exists in ramps currencies, set it as default
    const currency = getRampsCurrency(selectedCurrency.toUpperCase())
    return currency ? { ...DEFAULT_FORM_VALUE, currencyCode: currency.code } : DEFAULT_FORM_VALUE
  })

  // preload tokens so they can be preselected, better UX when switching tab
  useRampsBuyTokens(defaults.currencyCode)
  useRampsSellTokens(defaults.currencyCode)

  const handleChangeDefaults = useCallback((value: RampsFormSharedData) => {
    setDefaults((prev) => ({ ...prev, ...value }))
  }, [])

  const handleChangeTab = useCallback((mode: FormMode) => {
    setDefaults((prev) => ({ ...prev, mode }))
  }, [])

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="flex h-32 items-center justify-between gap-8 px-10">
        <div className="invisible size-12 shrink-0"></div>
        <div className="flex items-center gap-2">
          <FormModeSwitch mode={defaults.mode} onChange={handleChangeTab} />
        </div>
        <IconButton onClick={close}>
          <XIcon />
        </IconButton>
      </div>
      <div className="w-full grow overflow-hidden">
        {defaults.mode === "buy" && (
          <RampsBuyForm defaults={defaults} onChange={handleChangeDefaults} />
        )}
        {defaults.mode === "sell" && (
          <RampsSellForm defaults={defaults} onChange={handleChangeDefaults} />
        )}
      </div>
    </div>
  )
}

const FormModeSwitch: FC<{ mode: FormMode; onChange: (mode: FormMode) => void }> = ({
  mode,
  onChange,
}) => {
  const { t } = useTranslation()

  const handleChange = useCallback(
    (value: FormMode) => {
      // without this check we run into infinite loop
      if (value !== mode) onChange(value)
    },
    [mode, onChange],
  )

  return (
    <OptionSwitch
      options={[
        ["buy", t("Buy")],
        ["sell", t("Sell")],
      ]}
      className="bg-[#464646] text-xs text-white [&>div]:h-full"
      defaultOption={mode}
      onChange={handleChange}
    />
  )
}
