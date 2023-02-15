import { useCallback, useMemo, useState } from "react"

export declare type StatusOptions = "INITIALIZED" | "READY" | "PROCESSING" | "SUCCESS" | "ERROR"

type StatusOptionsRecord = Record<StatusOptions, StatusOptions>

export const statusOptions: StatusOptionsRecord = {
  INITIALIZED: "INITIALIZED",
  READY: "READY",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
}

interface UseStatusProps {
  status?: StatusOptions
  message?: string
}

export type SetStatusFn = {
  [S in Lowercase<StatusOptions>]: (msg?: string) => void
}

const useStatus = (props?: UseStatusProps) => {
  // set initial
  const [status, setStatus] = useState<StatusOptions>(props?.status || statusOptions.INITIALIZED)
  const [message, setMessage] = useState(props?.message)

  const setStatusAndMessage = useCallback(
    (status: StatusOptions) => (msg?: string) => {
      setStatus(status)
      setMessage(msg)
    },
    [setStatus, setMessage]
  )

  return {
    status,
    message,
    setStatus: useMemo(
      () => ({
        initialized: setStatusAndMessage("INITIALIZED"),
        ready: setStatusAndMessage("READY"),
        processing: setStatusAndMessage("PROCESSING"),
        success: setStatusAndMessage("SUCCESS"),
        error: setStatusAndMessage("ERROR"),
      }),
      [setStatusAndMessage]
    ) as SetStatusFn,
    statusOptions,
  }
}

export default useStatus
