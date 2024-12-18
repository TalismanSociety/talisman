import { ChevronLeftIcon } from "@talismn/icons"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { OptionSwitch } from "@talisman/components/OptionSwitch"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { RampForm } from "@ui/domains/Ramp/RampForm"

import { AuthorisedSiteToolbar } from "../../components/AuthorisedSiteToolbar"

export const PortfolioRamp = () => {
  const [formType, setFormType] = useState<"buy" | "sell">("buy")
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { selectedFolder: folder } = usePortfolioNavigation()
  return (
    <>
      {!folder && <AuthorisedSiteToolbar />}
      <div className="flex w-full flex-col py-4">
        <div className="flex items-center justify-between pb-6">
          <div className="flex items-center gap-2">
            <IconButton onClick={() => navigate("/portfolio")}>
              <ChevronLeftIcon />
            </IconButton>
            <div>
              <div className="font-bold text-white">{t("Buy/sell")}</div>
            </div>
          </div>
          <OptionSwitch
            options={[
              ["buy", t("Buy")],
              ["sell", t("Sell")],
            ]}
            className="bg-[#464646] text-xs text-white [&>div]:h-full"
            defaultOption={"buy"}
            onChange={(option) => setFormType(option)}
          />
        </div>
        <div>
          <RampForm formType={formType} />
        </div>
      </div>
    </>
  )
}
