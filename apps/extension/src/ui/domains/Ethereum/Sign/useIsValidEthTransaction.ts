import { EthPriorityOptionName, EthPriorityOptionNameEip1559 } from "@core/domains/signing/types"
import { useQuery } from "@tanstack/react-query"
import { ethers } from "ethers"
import { useEffect, useState } from "react"

export const useIsValidEthTransaction = (
  provider?: ethers.providers.JsonRpcProvider,
  transaction?: ethers.providers.TransactionRequest,
  priority?: EthPriorityOptionName
) => {
  // staleIsValid can be used to return previous value, this prevents having flashing approve button in tx form when gas changes on each block
  const [staleIsValid, setStaleIsValid] = useState(false)

  const { data, error, isLoading } = useQuery({
    queryKey: ["useCheckTransaction", provider?.network?.chainId, transaction, priority],
    queryFn: async () => {
      if (!provider || !transaction) {
        setStaleIsValid(false)
        return null
      }
      try {
        const estimatedGas = await provider.estimateGas(transaction)
        const result = estimatedGas?.gt(0)
        setStaleIsValid(result)
        return result
      } catch (err) {
        setStaleIsValid(false)
        // throw underlying ethers.js error if available, for a better error message
        throw (err as any)?.error ?? err
      }
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 0,
  })

  // reset stale value if priority changes
  useEffect(() => {
    setStaleIsValid(false)
  }, [priority])

  return { isValid: !!data, error, staleIsValid, isLoading }
}
