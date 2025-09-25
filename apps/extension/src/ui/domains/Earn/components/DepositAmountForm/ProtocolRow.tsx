import { useTranslation } from "react-i18next"

import { useDepositFunds } from "../useDepositFunds"

export const ProtocolRow = () => {
  const { t } = useTranslation()
  const { product } = useDepositFunds()

  if (!product) return null

  const { metadata } = product

  return (
    <div className="flex w-full items-center justify-between">
      <div className="text-grey-400">{t("Protocol")}</div>
      <div className="flex items-center gap-2">
        <img
          src={metadata.logoURI || undefined}
          alt={metadata.name}
          className="h-6 w-6 rounded-full"
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
        <div className="text-white">{metadata.name}</div>
      </div>
    </div>
  )
}
