/* eslint-disable no-console */
import { DEBUG } from "@extension/shared"
import { FC, useEffect } from "react"

// Dev tool to track Suspense render times
export const SuspenseTracker: FC<{ name: string }> = ({ name }) => {
  useEffect(() => {
    if (!DEBUG) return

    const key = `[SuspenseTracker] ${name} - ${crypto.randomUUID()}}`
    console.time(key)

    const timeout = setTimeout(() => {
      console.warn(`[SuspenseTracker] ${name} is taking too long to render`)
    }, 5_000)

    return () => {
      console.timeEnd(key)
      clearTimeout(timeout)
    }
  }, [name])

  return null
}
