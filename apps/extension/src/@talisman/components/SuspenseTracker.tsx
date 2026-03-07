// biome-ignore-all lint/suspicious/noConsole: debug logging
import { DEBUG } from "@common/extension-shared/constants"
import { type FC, useEffect } from "react"

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
