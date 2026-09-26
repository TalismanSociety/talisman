import { DEBUG } from "@common/constants"
import { log } from "@common/log"
import { type FC, useEffect } from "react"

const SuspenseTrackerInner: FC<{ name: string }> = ({ name }) => {
  useEffect(() => {
    const start = performance.now()

    return () => {
      log.log(`[SuspenseTracker] ${name} - ${(performance.now() - start).toFixed()} ms`)
    }
  }, [name])

  return null
}

// Dev tool to track Suspense render times
export const SuspenseTracker: FC<{ name: string }> = ({ name }) => {
  return DEBUG ? <SuspenseTrackerInner name={name} /> : null
}
