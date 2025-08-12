import { DefiPositionItemType } from "extension-core"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

export const PositionItemType: FC<{ type: DefiPositionItemType }> = ({ type }) => {
  const { t } = useTranslation()

  return useMemo(() => {
    switch (type) {
      case "airdrop":
        return t("Airdrop")
      case "deposit":
        return t("Deposit")
      case "loan":
        return t("Loan")
      case "locked":
        return t("Locked")
      case "reward":
        return t("Reward")
      case "margin":
        return t("Margin")
      case "staked":
        return t("Staked")
      default:
        return t("Unknown")
    }
  }, [t, type])
}
