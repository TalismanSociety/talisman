import { log } from "@core/log"
import { gasPriceOracleABI, gasPriceOracleAddress } from "@eth-optimism/contracts-ts"
import { useQuery } from "@tanstack/react-query"
import { BigNumber, UnsignedTransaction, ethers } from "ethers"
import { useMemo } from "react"

const OP_STACK_EVM_NETWORK_IDS = [
  10, // OP Mainnet,
  420, // OP Goerli
  7777777, // Zora Mainnet
  999, // Zora Goerli
  8453, // Base Mainnet
  84531, // Base Goerli
]

const getEthL1DataFee = async (
  provider: ethers.providers.JsonRpcProvider,
  serializedTx: string
): Promise<BigNumber> => {
  try {
    const contract = new ethers.Contract(gasPriceOracleAddress[420], gasPriceOracleABI, provider)
    const hexResult: string = await contract.getL1Fee(serializedTx)
    return BigNumber.from(hexResult)
  } catch (err) {
    log.error(err)
    throw new Error("Failed to get L1 data fee", { cause: err })
  }
}

const getUnsignedTransaction = (
  tx: ethers.providers.TransactionRequest | undefined
): UnsignedTransaction | null => {
  if (!tx) return null
  if (tx.nonce === undefined) return null

  const gasSettings =
    tx.type === 2
      ? {
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
          maxFeePerGas: tx.maxFeePerGas,
        }
      : {
          gasLimit: tx.gasLimit,
          gasPrice: tx.gasPrice,
        }

  return {
    to: tx.to,
    nonce: BigNumber.from(tx.nonce).toNumber(),
    chainId: tx.chainId,
    value: tx.value,
    data: tx.data,
    type: tx.type,
    ...gasSettings,
  }
}

export const useEthEstimateL1DataFee = (
  provider: ethers.providers.JsonRpcProvider | undefined,
  tx: ethers.providers.TransactionRequest | undefined
) => {
  const serialized = useMemo(() => {
    const unsigned = getUnsignedTransaction(tx)
    return unsigned ? ethers.utils.serializeTransaction(unsigned) : null
  }, [tx])

  return useQuery({
    queryKey: ["useL1Fee", provider?.network?.chainId, serialized],
    queryFn: () => {
      if (!provider?.network?.chainId || !serialized) return null

      return OP_STACK_EVM_NETWORK_IDS.includes(provider.network.chainId)
        ? getEthL1DataFee(provider, serialized)
        : BigNumber.from("0")
    },
    keepPreviousData: true,
    refetchInterval: 6_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: !!provider?.network && !!serialized,
  })
}
