import { useCallback, useEffect, useRef } from "react"

export type PayloadLockListener = (isLocked: boolean) => void

export const useReportPayloadLock = (onPayloadLockChange: PayloadLockListener | undefined) => {
  const onPayloadLockChangeRef = useRef(onPayloadLockChange)
  onPayloadLockChangeRef.current = onPayloadLockChange
  const isLockedRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (!isLockedRef.current) return
      isLockedRef.current = false
      onPayloadLockChangeRef.current?.(false)
    }
  }, [])

  return useCallback((isLocked: boolean) => {
    if (!isMountedRef.current) return
    isLockedRef.current = isLocked
    onPayloadLockChangeRef.current?.(isLocked)
  }, [])
}
