import { FC, useEffect } from "react"

// TODO REMOVE BEFORE MERGE
export const TimeToUnmount: FC<{ label: string }> = ({ label }) => {
  useEffect(() => {
    const key = `${label} - ${crypto.randomUUID()}`

    // eslint-disable-next-line no-console
    console.time(key)

    return () => {
      // eslint-disable-next-line no-console
      console.timeEnd(key)
    }
  }, [label])
  return null
}
