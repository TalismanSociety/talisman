import { AnySigningRequest } from "@core/domains/signing/types"
import { log } from "@core/log"
import { isEthereumRequest } from "@core/util/isEthereumRequest"
import useStatus from "@talisman/hooks/useStatus"
import { useCallback } from "react"

interface UseAnySigningRequestProps<T extends AnySigningRequest> {
  approveSignFn: (requestId: string, ...args: any[]) => void
  cancelSignFn: (requestId: string) => void
  currentRequest?: T
}

export const useAnySigningRequest = <T extends AnySigningRequest>({
  approveSignFn,
  cancelSignFn,
  currentRequest,
}: UseAnySigningRequestProps<T>) => {
  const { status, message, setStatus } = useStatus()

  const approve = useCallback(
    async (...args: any) => {
      setStatus.processing("Approving request")
      if (!currentRequest) return
      try {
        await approveSignFn(currentRequest.id, ...args)
        setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve", { err })
        setStatus.error(
          isEthereumRequest(currentRequest)
            ? (err as Error).message
            : "Failed to approve sign request"
        )
      }
    },
    [approveSignFn, currentRequest, setStatus]
  )

  // handle request rejection
  const reject = useCallback(async () => {
    try {
      if (currentRequest) await cancelSignFn(currentRequest.id)
    } catch (err) {
      // ignore, request doesn't exist
      // we just want popup to close
    }
    window.close()
  }, [cancelSignFn, currentRequest])

  return {
    id: currentRequest?.id,
    account: currentRequest?.account,
    url: currentRequest?.url,
    request: currentRequest?.request as T["request"],
    isEthereumRequest: currentRequest && isEthereumRequest(currentRequest),
    status,
    setStatus,
    message,
    approve,
    reject,
  }
}
