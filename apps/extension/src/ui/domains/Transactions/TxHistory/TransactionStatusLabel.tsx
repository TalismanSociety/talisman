import { LoaderIcon, XOctagonIcon } from "@talismn/icons"
import { TransactionStatus } from "extension-core"
import { FC } from "react"
import { useTranslation } from "react-i18next"

export const TransactionStatusLabel: FC<{ status: TransactionStatus }> = ({ status }) => {
  const { t } = useTranslation()

  switch (status) {
    case "error":
      return <span className="text-brand-orange">{t("Failed")}</span>
    case "pending":
      return (
        <>
          <span>{t("Submitting")} </span>
          <LoaderIcon className="animate-spin-slow text-body-disabled" />
        </>
      )
    case "success":
      return <span>{t("Confirmed")}</span>
    case "replaced":
      return (
        <>
          <span>{t("Cancelled")}</span>
          <XOctagonIcon className="text-brand-orange" />
        </>
      )
    case "unknown":
      return <span>{t("Unknown")}</span>
  }
}
