import { AnyEncryptRequest } from "@extension/core"
import { isDecryptRequest } from "@extension/core"
import { DEBUG } from "@extension/shared"
import useStatus from "@talisman/hooks/useStatus"
import { api } from "@ui/api"
import { useCallback } from "react"

export const useEncryptRequest = (currentRequest?: AnyEncryptRequest) => {
  const { status, message, setStatus } = useStatus()

  const approve = useCallback(async () => {
    if (!currentRequest) return
    setStatus.processing("Approving request")
    try {
      if (isDecryptRequest(currentRequest)) {
        await api.approveDecrypt(currentRequest.id)
        setStatus.success("Approved")
      } else {
        await api.approveEncrypt(currentRequest.id)
        setStatus.success("Approved")
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      DEBUG && console.error(err)
      if (isDecryptRequest(currentRequest)) {
        setStatus.error("Failed to approve decrypt request")
      } else {
        setStatus.error("Failed to approve encrypt request")
      }
    }
  }, [currentRequest, setStatus])

  const reject = useCallback(async () => {
    try {
      if (currentRequest) {
        await api.cancelEncryptRequest(currentRequest.id)
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
    type: currentRequest?.type,
    status,
    setStatus,
    message,
    approve,
    reject,
  }
}
