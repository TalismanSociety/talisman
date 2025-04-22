import { FC, useState } from "react"
import { useTranslation } from "react-i18next"

import { OptionSwitch } from "@talisman/components/OptionSwitch"

import { RampsBuyForm } from "./buy/RampsBuyForm"
import { RampsLayout } from "./shared/RampsLayout"
import { useRampsModal } from "./useRampsModal"

type FormMode = "buy" | "sell"

export const RampsFormRouter = () => {
  const { close } = useRampsModal()
  const [mode, setMode] = useState<FormMode>("buy")

  return (
    <RampsLayout
      onBackClick={close}
      title={"Buy/Sell"}
      topRight={<FormModeSwitch mode={mode} onChange={setMode} />}
    >
      {mode === "buy" && <RampsBuyForm />}
    </RampsLayout>
  )
}

const FormModeSwitch: FC<{ mode: FormMode; onChange: (mode: FormMode) => void }> = ({
  mode,
  onChange,
}) => {
  const { t } = useTranslation()

  return (
    <OptionSwitch
      options={[
        ["buy", t("Buy")],
        ["sell", t("Sell")],
      ]}
      className="bg-[#464646] text-xs text-white [&>div]:h-full"
      defaultOption={mode}
      onChange={(option) => onChange(option)}
    />
  )
}
