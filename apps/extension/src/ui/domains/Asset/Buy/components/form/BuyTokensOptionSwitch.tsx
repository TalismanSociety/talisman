import { useTranslation } from "react-i18next"

import { OptionSwitch } from "@talisman/components/OptionSwitch"

import { useBuyTokensWizard } from "../../useBuyTokensWizard"

export const BuyTokensOptionSwitch = () => {
  const { t } = useTranslation()
  const { isBuyForm, handleToggleFormType } = useBuyTokensWizard()

  return (
    <OptionSwitch
      options={[
        ["buy", t("Buy")],
        ["sell", t("Sell")],
      ]}
      className="bg-[#464646] text-xs text-white [&>div]:h-full"
      defaultOption={isBuyForm ? "buy" : "sell"}
      onChange={(option) => handleToggleFormType(option)}
    />
  )
}
