import React, { FC } from "react"
import { useTranslation } from "react-i18next"

import { useClaim } from "../useClaim"
import { Container } from "./Container"

export const ProductSummary: FC = () => {
  const { t } = useTranslation()
  const { product } = useClaim()

  if (!product) return null

  return (
    <Container className="space-y-4 px-8 py-6">
      <div className="flex w-full items-center justify-between">
        <div className="text-grey-400 text-xs">{t("Protocol")}</div>
        <div>{product.providerId || t("Unknown")}</div>
      </div>
    </Container>
  )
}
