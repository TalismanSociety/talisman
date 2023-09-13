import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

export const useNetworkType = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const type = searchParams.get("type")
  const defaultNetworkType = type === "polkadot" ? "polkadot" : "ethereum"

  const [networkType, setNetworkType] = useState<"polkadot" | "ethereum">(defaultNetworkType)
  useEffect(() => {
    if (networkType === "polkadot" && searchParams.get("type") !== "ethereum") return
    if (networkType === "ethereum" && searchParams.get("type") === "ethereum") return

    searchParams.set("type", networkType)
    setSearchParams(searchParams)
  }, [networkType, searchParams, setSearchParams])

  return [networkType, setNetworkType] as const
}
