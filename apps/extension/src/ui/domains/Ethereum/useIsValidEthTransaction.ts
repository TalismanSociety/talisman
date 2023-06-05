import { EthPriorityOptionName } from "@core/domains/signing/types"
import { useQuery } from "@tanstack/react-query"
import { ethers } from "ethers"

export const useIsValidEthTransaction = (
  provider?: ethers.providers.JsonRpcProvider,
  transaction?: ethers.providers.TransactionRequest,
  priority?: EthPriorityOptionName
) => {
  const { data, error, isLoading } = useQuery({
    queryKey: ["useCheckTransaction", provider?.network?.chainId, transaction, priority],
    queryFn: async () => {
      if (!provider || !transaction) {
        return null
      }

      // dry runs the transaction, if it fails we can't know for sure what the issue really is
      // there should be helpful message in the error though.
      const estimatedGas = await provider.estimateGas(transaction)
      return estimatedGas?.gt(0)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 0,
    keepPreviousData: true,
  })

  return { isValid: !!data, error, isLoading }
}
