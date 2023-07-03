import { FC } from "react"
import { useTranslation } from "react-i18next"

export const SignViewVotingUndelegate: FC<{
  trackId: number
}> = ({ trackId }) => {
  const { t } = useTranslation("request")
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <div>{t("Track")}</div>
        <div className="text-body">#{trackId}</div>
      </div>
    </div>
  )
}
