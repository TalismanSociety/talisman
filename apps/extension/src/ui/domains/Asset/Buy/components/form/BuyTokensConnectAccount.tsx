import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { api } from "@ui/api"
import { IS_POPUP } from "@ui/util/constants"

import { useBuyTokensWizard } from "../../useBuyTokensWizard"

type BuyTokensConnectAccountProps = {
  isEvm: boolean
}

export const BuyTokensConnectAccount = ({ isEvm }: BuyTokensConnectAccountProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { close } = useBuyTokensWizard()

  return (
    <button
      className="border-grey-750 bg-black-secondary flex h-[5.5rem] w-max min-w-full items-center justify-center rounded-[12px] border-[1px] px-6 py-3"
      onClick={() => {
        close()
        IS_POPUP ? api.dashboardOpen("/accounts/add") : navigate("/accounts/add")
      }}
    >
      {t(`Add ${isEvm ? "an ethereum" : "a substrate"} account `)}
    </button>
  )
}
