import { DefiPositionType } from "extension-core"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

export const PositionType: FC<{ type: DefiPositionType }> = ({ type }) => {
  const { t } = useTranslation()

  return useMemo(() => {
    switch (type) {
      case "deposit":
        return t("Deposit")
      case "loan":
        return t("Loan")
      case "reward":
        return t("Reward")
      case "lp":
        return t("Liquidity Provider")
      case "staking":
        return t("Staking")
      case "stream":
        return t("Streaming")
      case "unknown":
      default:
        return t("Position")
    }
  }, [type, t])
}
