import { isEthereumRequest } from "@extension/core"
import { AnySigningRequest, SigningRequests } from "@extension/core"
import { KnownRespondableRequest } from "@extension/core/libs/requests/types"
import { log } from "@extension/shared"
import useStatus, { SetStatusFn, StatusOptions } from "@talisman/hooks/useStatus"
import { useCallback } from "react"

interface UseAnySigningRequestProps<T extends AnySigningRequest> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  approveSignFn: (requestId: T["id"], ...args: any[]) => Promise<boolean>
  cancelSignFn: (requestId: T["id"]) => Promise<boolean>
  currentRequest?: T
}

type SignableRequest<T extends keyof SigningRequests> = Pick<
  KnownRespondableRequest<T>,
  "request" | "id" | "account" | "url"
> & {
  setStatus: SetStatusFn
  status: StatusOptions
  isEthereumRequest: boolean
  message?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  approve: (...args: any[]) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject: (...args: any[]) => void
  setReady: SetStatusFn["ready"]
}

export const useAnySigningRequest = <T extends AnySigningRequest>({
  approveSignFn,
  cancelSignFn,
  currentRequest,
}: UseAnySigningRequestProps<T>) => {
  const { status, message, setStatus } = useStatus()

  const approve = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const setReady = useCallback(() => {
    setStatus.ready()
  }, [setStatus])

  return {
    ...currentRequest,
    isEthereumRequest: currentRequest && isEthereumRequest(currentRequest),
    status,
    setStatus,
    message,
    approve,
    reject,
    setReady,
  } as SignableRequest<T["type"]>
}
