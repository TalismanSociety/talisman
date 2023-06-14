/* eslint-disable no-console */
import { DEBUG } from "@core/constants"
import { FC, useEffect } from "react"

// Dev tool to track Suspense render times
export const SuspenseTracker: FC<{ name: string }> = ({ name }) => {
  useEffect(() => {
    if (!DEBUG) return

    const key = `SuspenseTracker:${name} - ${crypto.randomUUID()}}`
    console.time(key)

    return () => {
      console.timeEnd(key)
    }
  }, [name])

  return null
}
