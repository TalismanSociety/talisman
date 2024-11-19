import { useCallback, useEffect, useMemo, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { DecodedCall } from "@ui/util/scaleApi"

import { DecodedBatchCall } from "../types"

const useBatchItemDrawerProvider = ({ decodedCall }: { decodedCall: DecodedBatchCall }) => {
  const [batchItemModalIndex, setBatchItemModalIndex] = useState(-1)

  // keep this in a state to keep last selected entry, so we can still display the item while the modal is closing
  const [currentIndex, setCurrentIndex] = useState<number>(-1)

  const batchCalls = useMemo<DecodedCall[]>(() => {
    return decodedCall.args.calls.map((call) => ({
      pallet: call.type,
      method: call.value.type,
      args: call.value.value,
    }))
  }, [decodedCall.args.calls])

  const currentCall = useMemo<DecodedCall | undefined>(
    () => batchCalls[currentIndex],
    [currentIndex, batchCalls],
  )

  useEffect(() => {
    if (batchItemModalIndex !== -1) setCurrentIndex(batchItemModalIndex)
  }, [batchItemModalIndex])

  const isOpen = useMemo(() => batchItemModalIndex !== -1, [batchItemModalIndex])

  const open = useCallback((index: number) => {
    setBatchItemModalIndex(index)
  }, [])

  const close = useCallback(() => setBatchItemModalIndex(-1), [])

  const canGoPrev = useMemo(() => batchItemModalIndex > 0, [batchItemModalIndex])

  const goPrev = useCallback(() => {
    if (canGoPrev) setBatchItemModalIndex((prev) => prev - 1)
  }, [canGoPrev])

  const canGoNext = useMemo(
    () => batchItemModalIndex < decodedCall.args.calls.length - 1,
    [batchItemModalIndex, decodedCall.args.calls.length],
  )

  const goNext = useCallback(() => {
    if (canGoNext) setBatchItemModalIndex((prev) => prev + 1)
  }, [canGoNext])

  return {
    isOpen,
    open,
    close,
    canGoPrev,
    canGoNext,
    goPrev,
    goNext,
    currentCall,
    currentIndex,
    batchItemsCount: batchCalls.length,
  }
}

export const [SubSignDecodedBatchDrawerProvider, useSubSignDecodedBatchDrawer] = provideContext(
  useBatchItemDrawerProvider,
)
