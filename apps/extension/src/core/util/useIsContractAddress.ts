import { useEthereumProvider } from "@ui/domains/Ethereum/useEthereumProvider"
import { useEffect, useState } from "react"
import { isContractAddress } from "./isContractAddress"

export const useIsContract = (evmNetworkId: number, address: string) => {
  const provider = useEthereumProvider(evmNetworkId)
  const [error, setError] = useState<Error>()
  const [isLoading, setIsLoading] = useState(false)
  const [isContract, setIsContract] = useState<boolean>()

  useEffect(() => {
    setError(undefined)
    setIsContract(undefined)
    setIsLoading(true)
    if (!provider) return
    isContractAddress(provider, address)
      .then(setIsContract)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [address, provider])

  return { isContract, isLoading, error }
}
