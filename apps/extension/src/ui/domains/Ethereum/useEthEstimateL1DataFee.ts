import { gasPriceOracleABI, gasPriceOracleAddress } from "@eth-optimism/contracts-ts"
import { useQuery } from "@tanstack/react-query"
import { log } from "extension-shared"
import { useMemo } from "react"
import { Hex, PublicClient, TransactionRequest, getContract, serializeTransaction } from "viem"

const OP_STACK_EVM_NETWORK_IDS = [
  10, // OP Mainnet,
  420, // OP Goerli
  7777777, // Zora Mainnet
  999, // Zora Goerli
  8453, // Base Mainnet
  84531, // Base Goerli
]

const getEthL1DataFee = async (publicClient: PublicClient, serializedTx: Hex): Promise<bigint> => {
  try {
    const contract = getContract({
      address: gasPriceOracleAddress[420],
      abi: gasPriceOracleABI,
      publicClient,
    })
    return await contract.read.getL1Fee([serializedTx])
  } catch (err) {
    log.error(err)
    throw new Error("Failed to get L1 data fee", { cause: err })
  }
}

export const useEthEstimateL1DataFee = (
  publicClient: PublicClient | undefined,
  tx: TransactionRequest | undefined
) => {
  const serialized = useMemo(
    () =>
      tx && publicClient?.chain?.id
        ? serializeTransaction({ chainId: publicClient.chain.id, ...tx })
        : null,
    [publicClient?.chain?.id, tx]
  )

  return useQuery({
    queryKey: ["useEthEstimateL1DataFee", publicClient?.chain?.id, serialized],
    queryFn: () => {
      if (!publicClient?.chain?.id || !serialized) return null

      return OP_STACK_EVM_NETWORK_IDS.includes(publicClient.chain.id)
        ? getEthL1DataFee(publicClient, serialized)
        : 0n
    },
    keepPreviousData: true,
    refetchInterval: 6_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: !!publicClient?.chain?.id && !!serialized,
  })
}
