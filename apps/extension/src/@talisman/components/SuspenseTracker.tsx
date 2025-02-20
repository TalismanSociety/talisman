/* eslint-disable no-console */
import { FC, useEffect } from "react"

import { DEBUG } from "@extension/shared"

const SuspenseTrackerInner: FC<{ name: string }> = ({ name }) => {
  useEffect(() => {
    const start = performance.now()

    return () => {
      console.log(`[SuspenseTracker] ${name} - ${(performance.now() - start).toFixed()} ms`)
    }
  }, [name])

  return null
}

// Dev tool to track Suspense render times
export const SuspenseTracker: FC<{ name: string }> = ({ name }) => {
  return DEBUG ? <SuspenseTrackerInner name={name} /> : null
}
