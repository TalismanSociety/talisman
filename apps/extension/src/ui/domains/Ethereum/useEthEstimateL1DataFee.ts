import { gasPriceOracleABI, gasPriceOracleAddress } from "@eth-optimism/contracts-ts"
import { getTransactionSerializable } from "@extension/core"
import { log } from "@extension/shared"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { Hex, PublicClient, TransactionRequest, getContract, serializeTransaction } from "viem"

const OP_STACK_L1_FEE_ORACLE: Record<number, `0x${string}`> = {
  10: gasPriceOracleAddress[420], // OP Mainnet,
  420: gasPriceOracleAddress[420], // OP Goerli
  7777777: gasPriceOracleAddress[420], // Zora Mainnet
  999: gasPriceOracleAddress[420], // Zora Goerli
  8453: gasPriceOracleAddress[420], // Base Mainnet
  84531: gasPriceOracleAddress[420], // Base Goerli
  534351: "0x5300000000000000000000000000000000000002", // Scroll Sepolia Testnet
  534352: "0x5300000000000000000000000000000000000002", // Scroll Mainnet
}

const getEthL1DataFee = async (
  publicClient: PublicClient,
  serializedTx: Hex,
  contractAddress: `0x${string}`
): Promise<bigint> => {
  try {
    const contract = getContract({
      address: contractAddress,
      abi: gasPriceOracleABI,
      client: { public: publicClient },
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
        ? serializeTransaction(getTransactionSerializable(tx, publicClient.chain.id))
        : null,
    [publicClient?.chain?.id, tx]
  )

  return useQuery({
    queryKey: ["useEthEstimateL1DataFee", publicClient?.chain?.id, serialized],
    queryFn: () => {
      if (!publicClient?.chain?.id || !serialized) return null

      return OP_STACK_L1_FEE_ORACLE[publicClient.chain.id]
        ? getEthL1DataFee(publicClient, serialized, OP_STACK_L1_FEE_ORACLE[publicClient.chain.id])
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
