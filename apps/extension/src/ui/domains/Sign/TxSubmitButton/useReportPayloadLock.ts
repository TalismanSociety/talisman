import { useCallback, useEffect, useRef } from "react"

/** reports lock changes, and releases a held lock when the signing step unmounts */
export const useReportPayloadLock = (
  onPayloadLockChange: ((isLocked: boolean) => void) | undefined
) => {
  const onPayloadLockChangeRef = useRef(onPayloadLockChange)
  onPayloadLockChangeRef.current = onPayloadLockChange
  const isLockedRef = useRef(false)

  useEffect(
    () => () => {
      if (isLockedRef.current) onPayloadLockChangeRef.current?.(false)
    },
    []
  )

  return useCallback((isLocked: boolean) => {
    isLockedRef.current = isLocked
    onPayloadLockChangeRef.current?.(isLocked)
  }, [])
}
