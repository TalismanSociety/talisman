import { PGPRequest } from "@core/domains/pgp/types"
import useStatus from "@talisman/hooks/useStatus"
import { api } from "@ui/api"
import { useCallback } from "react"

export const usePgpEncryptRequest = (currentRequest?: PGPRequest) => {
  const { status, message, setStatus } = useStatus()

  const approve = useCallback(
    async (...args: any) => {
      setStatus.processing("Approving request")
      if (!currentRequest) return
      try {
        await api.approveEncrypt(currentRequest.id)
        setStatus.success("Approved")
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
        setStatus.error(
            "Failed to approve encrypt request"
        )
      }
    },
    [currentRequest, setStatus]
  )

  // TODO-pgp handle request rejection
  const reject = useCallback(async () => {
    try {
      if (currentRequest) {
        // await api.cancelPgpRequest(currentRequest.id)
      }
    } catch (err) {
      // ignore, request doesn't exist
      // we just want popup to close
    }
    window.close()
  }, [currentRequest])

  return {
    id: currentRequest?.id,
    account: currentRequest?.account,
    url: currentRequest?.url,
    request: currentRequest?.request,
    status,
    setStatus,
    message,
    approve,
    reject,
  }
}

