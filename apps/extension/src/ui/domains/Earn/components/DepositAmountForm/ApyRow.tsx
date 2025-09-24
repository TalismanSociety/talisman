import { useTranslation } from "react-i18next"

import { useDepositFunds } from "../useDepositFunds"

export const ApyRow = () => {
  const { t } = useTranslation()
  const { product } = useDepositFunds()

  if (!product) return null

  const { rewardRate } = product
  const apy = rewardRate.total * 100 // Convert decimal to percentage

  return (
    <div className="flex w-full items-center justify-between">
      <div>{t("APY")}</div>
      <div>{apy.toFixed(2)}%</div>
    </div>
  )
}
