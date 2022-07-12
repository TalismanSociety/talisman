import { AnySigningRequest } from "@core/domains/signing/types"
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
        // eslint-disable-next-line no-console
        console.error(err)
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
    setStatus.processing("Rejecting request")
    if (!currentRequest) return
    try {
      await cancelSignFn(currentRequest.id)
      setStatus.success("Rejected")
    } catch (err) {
      setStatus.error("Failed to reject sign request")
    }
  }, [cancelSignFn, currentRequest, setStatus])

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
