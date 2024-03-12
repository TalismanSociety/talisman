import { log } from "@extension/shared"
import { DEBUG } from "@extension/shared"
import isEqual from "lodash/isEqual"
import { useEffect, useRef } from "react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UseAlec = (label: string, value: any) => void

const useAlecAtClub: UseAlec = () => {}

const useAlecAtWork: UseAlec = (label, value) => {
  const refPrev = useRef(value)

  useEffect(() => {
    // print initial value
    log.debug("[useAlec]", label, { value })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label])

  const prev = refPrev.current

  const changes = Object.keys({ ...prev, ...value }).reduce((acc, key) => {
    try {
      if (!isEqual(prev[key], value[key])) acc[key] = { from: prev[key], to: value[key] }
    } catch (err) {
      acc[key] = "[useAlec] - Failed to read key"
    }
    return acc
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, {} as Record<string, any>)

  if (Object.keys(changes).length) log.debug("[useAlec]", label, { value, changes })

  refPrev.current = value
}

/**
 * Dev-only hook used to detect changes to an object between renders
 */
export const useAlec = DEBUG ? useAlecAtWork : useAlecAtClub
