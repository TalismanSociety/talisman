import { useCallback, useEffect, useRef } from "react"

/** reports lock changes, releases a held lock on unmount, then ignores late reports (Ledger promises outlive the step) */
export const useReportPayloadLock = (
  onPayloadLockChange: ((isLocked: boolean) => void) | undefined
) => {
  const onPayloadLockChangeRef = useRef(onPayloadLockChange)
  onPayloadLockChangeRef.current = onPayloadLockChange
  const isLockedRef = useRef(false)

  useEffect(
    () => () => {
      if (isLockedRef.current) onPayloadLockChangeRef.current?.(false)
      onPayloadLockChangeRef.current = undefined
    },
    []
  )

  return useCallback((isLocked: boolean) => {
    isLockedRef.current = isLocked
    onPayloadLockChangeRef.current?.(isLocked)
  }, [])
}
