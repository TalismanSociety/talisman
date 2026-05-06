import { log } from "@common/log"
import { api } from "@ui/api"
import { useTransaction } from "@ui/state/transactions"
import { useEffect, useRef } from "react"

export const useRefreshAccountProxiesOnTxSuccess = ({
  hash,
  networkId,
  address,
}: {
  hash: string | null | undefined
  networkId: string | null | undefined
  address: string
}) => {
  const tx = useTransaction(hash ?? "")
  const refreshedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!hash || !networkId || tx?.status !== "success") return

    const refreshKey = `${networkId}:${address}:${hash}`
    if (refreshedKeyRef.current === refreshKey) return
    refreshedKeyRef.current = refreshKey

    api.accountProxiesRefresh({ networkId, address }).catch((err) => {
      log.error("[accountProxies] failed to refresh after transaction success", err)
    })
  }, [address, hash, networkId, tx?.status])
}
