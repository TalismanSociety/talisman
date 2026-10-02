import { classifyError, type ErrorCategory } from "@common/analytics/errorCategory"
import { log } from "@common/log"
import type { AnySigningRequest, SigningRequests } from "@core/domains/signing/types"
import type { KnownRespondableRequest } from "@core/libs/requests/types"
import { isEthereumRequest } from "@core/types/requests"
import { getErrorMessage } from "@talismn/util"
import useStatus, { type SetStatusFn, type StatusOptions } from "@ui/hooks/useStatus"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

interface UseAnySigningRequestProps<T extends AnySigningRequest, TApproveArgs extends unknown[]> {
  approveSignFn: (requestId: T["id"], ...args: TApproveArgs) => Promise<boolean>
  cancelSignFn: (requestId: T["id"]) => Promise<boolean>
  currentRequest?: T
}

type SignableRequest<T extends keyof SigningRequests, TApproveArgs extends unknown[]> = Pick<
  KnownRespondableRequest<T>,
  "request" | "id" | "account" | "url"
> & {
  setStatus: SetStatusFn
  status: StatusOptions
  isEthereumRequest: boolean
  message?: string
  /** What kind of failure the ERROR status shows. */
  errorCategory: ErrorCategory
  /** Shows the approval failure, classified from what was thrown. */
  fail: (cause: unknown, message: string) => void
  approve: (...args: TApproveArgs) => Promise<void>
  reject: () => Promise<void>
  setReady: SetStatusFn["ready"]
}

export const useAnySigningRequest = <T extends AnySigningRequest, TApproveArgs extends unknown[]>({
  approveSignFn,
  cancelSignFn,
  currentRequest,
}: UseAnySigningRequestProps<T, TApproveArgs>) => {
  const { status, message, setStatus } = useStatus()
  const [errorCategory, setErrorCategory] = useState<ErrorCategory>("unknown")
  const { t } = useTranslation()

  const fail = useCallback(
    (cause: unknown, message: string) => {
      setErrorCategory(classifyError(cause))
      setStatus.error(message)
    },
    [setStatus]
  )

  const approve = useCallback(
    async (...args: TApproveArgs) => {
      setStatus.processing("Approving request")
      if (!currentRequest) return
      try {
        await approveSignFn(currentRequest.id, ...args)
        setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve", { err })
        fail(
          err,
          isEthereumRequest(currentRequest)
            ? getErrorMessage(err, t("Unknown error"))
            : "Failed to approve sign request"
        )
      }
    },
    [approveSignFn, currentRequest, setStatus, fail, t]
  )

  // handle request rejection
  const reject = useCallback(async () => {
    try {
      if (currentRequest) await cancelSignFn(currentRequest.id)
    } catch {
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
    errorCategory,
    fail,
    approve,
    reject,
    setReady,
  } as SignableRequest<T["type"], TApproveArgs>
}
