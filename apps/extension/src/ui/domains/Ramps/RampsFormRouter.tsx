import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import { OptionSwitch } from "@talisman/components/OptionSwitch"
import { useSelectedCurrency } from "@ui/state"

import { RampsBuyForm } from "./buy/RampsBuyForm"
import { useRampsBuyTokens } from "./buy/useRampsBuyTokens"
import { RampsSellForm } from "./sell/RampsSellForm"
import { useRampsSellTokens } from "./sell/useRampsSellTokens"
import { getRampsCurrency } from "./shared/currencies"
import { RampsLayout } from "./shared/RampsLayout"
import { RampsFormSharedData } from "./shared/types"
import { useRampsModal } from "./useRampsModal"

type FormMode = "buy" | "sell"

type FormDefaults = RampsFormSharedData & {
  mode: FormMode
}

const DEFAULT_FORM_VALUE: FormDefaults = {
  mode: "buy",
  // @dev: use this to prefill the form when debugging
  // currencyCode: "USD",
  // tokenId: "1-evm-native",
}

export const RampsFormRouter = () => {
  const selectedCurrency = useSelectedCurrency()
  const { t } = useTranslation()
  const { close } = useRampsModal()

  const [defaults, setDefaults] = useState(() => {
    if (DEFAULT_FORM_VALUE.currencyCode) return DEFAULT_FORM_VALUE
    // if user's current currency exists in ramps currencies, set it as default
    const currency = getRampsCurrency(selectedCurrency.toUpperCase())
    return currency ? { ...DEFAULT_FORM_VALUE, currencyCode: currency.code } : DEFAULT_FORM_VALUE
  })

  // preload data for inputs, prevents waiting when switching tab
  useRampsBuyTokens(defaults.currencyCode)
  useRampsSellTokens(defaults.currencyCode)

  const handleChangeDefaults = useCallback((value: RampsFormSharedData) => {
    setDefaults((prev) => ({ ...prev, ...value }))
  }, [])

  const handleChangeTab = useCallback((mode: FormMode) => {
    setDefaults((prev) => ({ ...prev, mode }))
  }, [])

  return (
    <RampsLayout
      onBackClick={close}
      title={t("Buy/Sell")}
      topRight={<FormModeSwitch mode={defaults.mode} onChange={handleChangeTab} />}
    >
      {defaults.mode === "buy" && (
        <RampsBuyForm defaults={defaults} onChange={handleChangeDefaults} />
      )}
      {defaults.mode === "sell" && (
        <RampsSellForm defaults={defaults} onChange={handleChangeDefaults} />
      )}
    </RampsLayout>
  )
}

const FormModeSwitch: FC<{ mode: FormMode; onChange: (mode: FormMode) => void }> = ({
  mode,
  onChange,
}) => {
  const { t } = useTranslation()

  const handleChange = useCallback(
    (value: FormMode) => {
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
