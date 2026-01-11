import { BalanceDto } from "extension-core"
import { FC } from "react"
import { useTranslation } from "react-i18next"

export const YieldxyzBalanceTypeDisplay: FC<{ balance: BalanceDto }> = ({ balance }) => {
  const { t } = useTranslation()
  switch (balance.type) {
    case "active":
      return t("Supplied")
    case "claimable":
      return t("Claimable")
    case "entering":
      return t("Entering")
    case "exiting":
      return t("Exiting")
    case "locked":
      return t("Locked")
    case "withdrawable":
      return t("Withdrawable")
  }
}
