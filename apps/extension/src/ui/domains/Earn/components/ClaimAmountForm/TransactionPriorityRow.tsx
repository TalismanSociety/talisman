import React from "react"
import { useTranslation } from "react-i18next"

import { useClaim } from "../useClaim"

export const TransactionPriorityRow = () => {
  const { t } = useTranslation()
  const { transaction } = useClaim()

  // Only show priority for Ethereum transactions
  if (transaction?.platform !== "ethereum") return null

  return (
    <div className="flex w-full items-center justify-between">
      <div className="text-grey-400">{t("Priority")}</div>
      <div className="text-white">Standard</div>
    </div>
  )
}
