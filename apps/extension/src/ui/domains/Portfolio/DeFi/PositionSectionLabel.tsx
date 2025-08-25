import { FC } from "react"
import { useTranslation } from "react-i18next"

export type PositionSectionType = "supplied" | "rewards"

export const PositionSectionLabel: FC<{ type: PositionSectionType }> = ({ type }) => {
  const { t } = useTranslation()

  switch (type) {
    case "supplied":
      return <>{t("Supplied")}</>
    case "rewards":
      return <>{t("Rewards")}</>
  }
}
