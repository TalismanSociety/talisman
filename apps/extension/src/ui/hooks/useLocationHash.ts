import { useState, useEffect } from "react"

export const useLocationHash = () => {
  const [locationHash, setLocationHash] = useState<string | undefined>(window.location.hash)

  useEffect(() => {
    const handleHashChange = (event: HashChangeEvent) =>
      event && setLocationHash((event.target as Window).location.hash)

    window.addEventListener("hashchange", handleHashChange)

    return () => {
      window.removeEventListener("hashchange", handleHashChange)
    }
  }, [])

  return locationHash
}
