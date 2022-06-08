import { AccountJsonAny } from "@core/types"
import downloadJson from "@talisman/util/downloadJson"
import { api } from "@ui/api"
import { useCallback, useMemo } from "react"

const EXPORTABLE_ORIGINS = ["SEED", "JSON", "DERIVED"]

export const useAccountExport = (account?: AccountJsonAny) => {
  const canExportAccount = useMemo(
    () => EXPORTABLE_ORIGINS.includes(account?.origin as string),
    [account?.origin]
  )

  const exportAccount = useCallback(async () => {
    if (!account) return
    const { exportedJson } = await api.accountExport(account.address)
    downloadJson(exportedJson, `${exportedJson.meta?.name || "talisman"}`)
  }, [account])

  return { canExportAccount, exportAccount }
}
