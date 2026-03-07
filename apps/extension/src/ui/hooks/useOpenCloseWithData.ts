import { useCallback, useEffect, useMemo, useState } from "react"

type OpenCloseWithData<T> = { isOpenReady: boolean; data: T | undefined; onUnmount: () => void }

/**
 * Helper hook to handle opening and closing of a component with data (drawer displaying data)
 * Allows for 1 frame to be rendered before we actually open, resulting in a predictable open animation, removing flickering
 * Also keeps data available while closing
 * @param isOpen isOpen flag to pass to the open/close component
 * @param data data to display in the component to open/close
 * @returns
 * isOpenReady: effective isOpen flag with a 1 frame delay, to allow for a predictable open animation, removing flickering
 * data: data to display in the component to open/close
 * onUnmount: callback to call when the component is unmounted
 */
export const useOpenCloseWithData = <T, Result = OpenCloseWithData<T>>(
  isOpen: boolean | undefined,
  data: T | undefined
): Result => {
  const [previousData, setPreviousData] = useState<T>()
  useEffect(() => {
    if (isOpen && data) setPreviousData(data)
  }, [isOpen, data])

  const onUnmount = useCallback(() => {
    setPreviousData(undefined)
  }, [])

  return useMemo(() => {
    // staleData is the that can be rendered
    // allows for 1 frame to be rendered before we actually open, resulting in a predictable animation, removing flickering
    // also allows to keep data available while drawer is closing
    const staleData = data ?? previousData

    return {
      isOpenReady: isOpen && !!staleData,
      data: staleData,
      onUnmount,
    } as Result
  }, [data, isOpen, onUnmount, previousData])
}
