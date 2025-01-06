import { ChevronLeftIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { OptionSwitch } from "@talisman/components/OptionSwitch"
import { IS_POPUP } from "@ui/util/constants"

type RampOptionSwitchHeaderProps = {
  setSelectedFormType: React.Dispatch<React.SetStateAction<"buy" | "sell">>
}
export const RampOptionSwitchHeader = ({ setSelectedFormType }: RampOptionSwitchHeaderProps) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <div className="flex w-full flex-col py-4">
      <div className="flex items-center justify-between pb-6">
        <div className={"flex items-center gap-2"}>
          <div className={classNames("flex items-center", !IS_POPUP && "hidden")}>
            <IconButton onClick={() => navigate("/portfolio")}>
              <ChevronLeftIcon />
            </IconButton>
          </div>
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
