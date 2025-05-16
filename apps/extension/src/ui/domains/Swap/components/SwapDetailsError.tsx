import { useTranslation } from "react-i18next"

export const SwapDetailsError: React.FC<{ message?: string }> = ({ message }) => {
  const { t } = useTranslation()

  return (
    <div className="border-grey-800 mt-4 flex flex-col items-center justify-center rounded border p-8">
      <h4 className="text-center text-sm font-bold">{t("Failed to get quote")}</h4>
      <p className="text-grey-400 text-center text-sm">{message}</p>
    </div>
  )
}
