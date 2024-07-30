import { gasPriceOracleABI, gasPriceOracleAddress } from "@eth-optimism/contracts-ts"
import { useQuery } from "@tanstack/react-query"
import { log } from "extension-shared"
import { useMemo } from "react"
import {
  getContract,
  Hex,
  parseAbi,
  PublicClient,
  serializeTransaction,
  TransactionRequest,
} from "viem"

import { getTransactionSerializable } from "@extension/core"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"

const getOpStackEthL1DataFee = async (
  publicClient: PublicClient,
  serializedTx: Hex
): Promise<bigint> => {
  try {
    const contract = getContract({
      address: gasPriceOracleAddress[420],
      abi: gasPriceOracleABI,
      client: { public: publicClient },
    })
    return await contract.read.getL1Fee([serializedTx])
  } catch (err) {
    log.error(err)
    throw new Error("Failed to get op-stack L1 data fee", { cause: err })
  }
}

const getScrollStackEthL1DataFee = async (
  publicClient: PublicClient,
  serializedTx: Hex,
  l1PriceOracleAddress: `0x${string}`
): Promise<bigint> => {
  try {
    const contract = getContract({
      address: l1PriceOracleAddress,
      abi: parseAbi(["function getL1Fee(bytes memory _data) view returns (uint256)"]),
      client: { public: publicClient },
    })
    return await contract.read.getL1Fee([serializedTx])
  } catch (err) {
    log.error(err)
    throw new Error("Failed to get op-stack L1 data fee", { cause: err })
  }
}

export const useEthEstimateL1DataFee = (
  publicClient: PublicClient | undefined,
  tx: TransactionRequest | undefined
) => {
  const evmNetwork = useEvmNetwork(publicClient?.chain?.id?.toString())

  const serialized = useMemo(
    () =>
      tx && publicClient?.chain?.id
        ? serializeTransaction(getTransactionSerializable(tx, publicClient.chain.id))
        : null,
    [publicClient?.chain?.id, tx]
  )

  return useQuery({
    queryKey: ["useEthEstimateL1DataFee", publicClient?.chain?.id, serialized, evmNetwork?.id],
    queryFn: () => {
      if (!publicClient?.chain?.id || !serialized || !evmNetwork?.l2FeeType) return null

      switch (evmNetwork.l2FeeType.type) {
        case "op-stack":
          return getOpStackEthL1DataFee(publicClient, serialized)
        case "scroll":
          return getScrollStackEthL1DataFee(
            publicClient,
            serialized,
            evmNetwork.l2FeeType.l1GasPriceOracle
          )
      }
    },
    keepPreviousData: true,
    refetchInterval: 6_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: !!publicClient?.chain?.id && !!serialized,
  })
}
