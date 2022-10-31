import { AnyEncryptRequest, DecryptRequest } from "@core/domains/encrypt/types"
import { isDecryptRequest } from "@core/util/isDecryptRequest"
import useStatus from "@talisman/hooks/useStatus"
import { api } from "@ui/api"
import { useCallback } from "react"

export const useEncryptRequest = (currentRequest?: AnyEncryptRequest) => {
  const { status, message, setStatus } = useStatus()

  const approve = useCallback(
    async (...args: any) => {
      setStatus.processing("Approving request")
      if (!currentRequest) return
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
        console.error(err)
        if (isDecryptRequest(currentRequest)) {
          setStatus.error("Failed to approve decrypt request")
        } else {
          setStatus.error("Failed to approve encrypt request")
        }
      }
    },
    [currentRequest, setStatus]
  )

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
    status,
    setStatus,
    message,
    approve,
    reject,
    isDecrypt: (currentRequest as DecryptRequest)?.request?.payload?.sender !== undefined, // bit hacky, should really use isDecryptRequest from utils
  }
}
