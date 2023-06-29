import { FC } from "react"
import { useTranslation } from "react-i18next"

export const SignViewStakingCancel: FC = () => {
  const { t } = useTranslation("request")
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div>{t("You are canceling your delegation activity")}</div>
    </div>
  )
}
