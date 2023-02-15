import { AssetTransferHandler } from "@core/domains/transactions"
import { AssetTransferMethod } from "@core/domains/transactions/types"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useDebouncedMemo } from "@ui/hooks/useDebouncedMemo"
import useToken from "@ui/hooks/useToken"
import { isSubToken } from "@ui/util/isSubToken"

import { getExtensionEthereumProvider } from "../Ethereum/getExtensionEthereumProvider"

// TODO should also work with gasSettings
export const useSendFundsEstimateFee = (
  from?: string | null,
  to?: string | null,
  tokenId?: string | null,
  amount = "0",
  tip = "0",
  method?: AssetTransferMethod
) => {
  const token = useToken(tokenId)

  const debouncedAmount = useDebouncedMemo(() => amount, 200, [amount])

  return useQuery({
    queryKey: ["sendFunds", "estimateFee", from, to, token?.id, debouncedAmount, method],
    queryFn: async () => {
      if (!token || !from || !to || (!debouncedAmount && method !== "transferAll")) {
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
          if (!debouncedAmount) throw new Error("Amount is required")
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
            debouncedAmount ?? undefined,
            tip,
            method
          )
          // TODO we don't want a pendingTransferId => they stay forever in memory on backend
          return { estimatedFee: partialFee, unsigned, pendingTransferId }
        }
        default:
          throw new Error("Unsupported token type")
      }
    },
    retry: false,
    refetchInterval: 10_000,
  })
}
