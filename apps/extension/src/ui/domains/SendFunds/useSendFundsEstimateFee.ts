import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useDebouncedMemo } from "@ui/hooks/useDebouncedMemo"
import useToken from "@ui/hooks/useToken"

import { getExtensionEthereumProvider } from "../Ethereum/getExtensionEthereumProvider"

export const useSendFundsEstimateFee = (
  from?: string | null,
  to?: string | null,
  tokenId?: string | null,
  amount?: string | null,
  tip = "0",
  allowReap = false
) => {
  const token = useToken(tokenId)

  const debouncedAmount = useDebouncedMemo(() => amount, 200, [amount])

  return useQuery({
    queryKey: ["sendFunds", "estimateFee", from, to, token?.id, debouncedAmount],
    queryFn: async () => {
      if (!token || !from || !to || !debouncedAmount) {
        return {
          estimatedFee: null,
          unsigned: null,
          pendingTransferId: null,
        }
      }
      switch (token.type) {
        case "evm-erc20":
        case "evm-native": {
          if (!token.evmNetwork) throw new Error("EVM Network not found")
          try {
            const provider = getExtensionEthereumProvider(token.evmNetwork.id)
            const [gasPrice, estimatedGas] = await Promise.all([
              provider.getGasPrice(),
              provider.estimateGas({ from, to, value: debouncedAmount }),
            ])
            return {
              estimatedFee: gasPrice.mul(estimatedGas).toString(),
              unsigned: null,
              pendingTransferId: null,
            }
          } catch (err) {
            if ((err as any)?.code === "INSUFFICIENT_FUNDS") throw new Error("Insufficient funds")
            throw (err as any).error ?? err
          }
        }
        case "substrate-native":
        case "substrate-orml":
        case "substrate-assets":
        case "substrate-equilibrium":
        case "substrate-tokens": {
          const { partialFee, unsigned, pendingTransferId } = await api.assetTransferCheckFees(
            token.chain.id,
            token.id,
            from,
            to,
            debouncedAmount,
            tip,
            allowReap
          )
          return { estimatedFee: partialFee, unsigned, pendingTransferId }
        }
      }
    },
    retry: false,
    refetchInterval: 10_000,
  })
}
