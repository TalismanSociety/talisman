import { useTranslation } from "react-i18next"

export const NftsUnavailable = () => {
  const { t } = useTranslation()
  return (
    <div className="rounded bg-black-tertiary p-10 text-body-secondary">
      {t("NFTs are under maintenance and will come back soon")}
    </div>
  )
}
