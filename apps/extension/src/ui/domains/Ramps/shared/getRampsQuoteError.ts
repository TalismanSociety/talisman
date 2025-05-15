import { t } from "i18next"

import { RampsQuoteError } from "./types"

export const getRampsQuoteError = (description?: string): RampsQuoteError => ({
  type: "error",
  message: t("Unavailable"),
  description: description ?? t("Failed to get a quote"),
})
