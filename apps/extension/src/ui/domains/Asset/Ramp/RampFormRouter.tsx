import { FC, useState } from "react"
import { useTranslation } from "react-i18next"

import { OptionSwitch } from "@talisman/components/OptionSwitch"

import { RampBuyForm } from "./buy/RampBuyForm"
import { RampLayout } from "./shared/RampLayout"
import { useRampModal } from "./useRampModal"

type FormMode = "buy" | "sell"

export const RampFormRouter = () => {
  const { close } = useRampModal()
  const [mode, setMode] = useState<FormMode>("buy")

  return (
    <RampLayout
      onBackClick={close}
      title={"Buy/Sell"}
      topRight={<FormModeSwitch mode={mode} onChange={setMode} />}
    >
      {mode === "buy" && <RampBuyForm />}
    </RampLayout>
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
