import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { ledgerNetworks } from "./common"

export const useLedgerSubstrateLegacyApp = (genesisHash?: string | null) => {
  const { t } = useTranslation()
  return useMemo(
    () =>
      genesisHash
        ? ledgerNetworks.find((n) => n.genesisHash === genesisHash) ?? {
            name: "",
            genesisHash: "",
            label: t("Unknown app"),
          }
        : null,
    [genesisHash, t]
  )
}
