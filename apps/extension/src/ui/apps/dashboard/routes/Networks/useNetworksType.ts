import { ProviderType } from "@extension/core"
import { useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"

export const useNetworksType = () => {
  const params = useParams()
  const networksType = ["polkadot", "ethereum"].includes(params.networksType ?? "")
    ? (params.networksType as ProviderType)
    : "ethereum"

  const navigate = useNavigate()
  const setNetworksType = useCallback(
    (networksType: ProviderType) => navigate(`/settings/networks-tokens/networks/${networksType}`),
    [navigate]
  )

  return [networksType, setNetworksType] as const
}
