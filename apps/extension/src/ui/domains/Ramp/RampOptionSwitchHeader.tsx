import { ChevronLeftIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { OptionSwitch } from "@talisman/components/OptionSwitch"

type RampOptionSwitchHeaderProps = {
  setSelectedFormType: React.Dispatch<React.SetStateAction<"buy" | "sell">>
}
export const RampOptionSwitchHeader = ({ setSelectedFormType }: RampOptionSwitchHeaderProps) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <div className="flex w-full flex-col py-4">
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          <IconButton onClick={() => navigate("/portfolio")}>
            <ChevronLeftIcon />
          </IconButton>
          <div>
            <div className="font-bold capitalize text-white">{t("Buy/Sell")}</div>
          </div>
        </div>
        <OptionSwitch
          options={[
            ["buy", t("Buy")],
            ["sell", t("Sell")],
          ]}
          className="bg-[#464646] text-xs text-white [&>div]:h-full"
          defaultOption={"buy"}
          onChange={(option) => setSelectedFormType(option)}
        />
      </div>
    </div>
  )
}
