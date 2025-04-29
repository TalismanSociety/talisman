import { useTranslation } from "react-i18next"

export const NftsUnavailable = () => {
  const { t } = useTranslation()
  return (
    <div className="text-body-secondary bg-black-tertiary rounded p-10">
      {t("NFTs will return soon")}
    </div>
  )
}
