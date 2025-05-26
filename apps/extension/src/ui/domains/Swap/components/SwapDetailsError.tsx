import { classNames } from "@talismn/util"
import { useTranslation } from "react-i18next"

export const SwapDetailsError = ({
  message,
  messageClassName,
}: {
  message?: string
  messageClassName?: string
}) => {
  const { t } = useTranslation()

  return (
    <div className="border-grey-800 mt-4 flex flex-col items-center justify-center rounded border p-8">
      <h4 className="text-center text-sm font-bold">{t("Failed to get quote")}</h4>
      <p className={classNames("text-center text-[14px] text-gray-400", messageClassName)}>
        {message}
      </p>
    </div>
  )
}
