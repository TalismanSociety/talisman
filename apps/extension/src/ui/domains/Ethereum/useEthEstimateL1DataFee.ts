import { log } from "@common/log"
import { getTransactionSerializable } from "@core/domains/ethereum/helpers"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useNetworkById } from "@ui/state/chaindata"
import { useMemo } from "react"
import {
  getContract,
  type Hex,
  type PublicClient,
  parseAbi,
  serializeTransaction,
  type TransactionRequest,
} from "viem"

// The GasPriceOracle is a predeploy living at the same address on every OP-stack L2.
// Previously sourced from @eth-optimism/contracts-ts, inlined here to drop that dependency
// (it pulled a large vulnerable wagmi/walletconnect/coinbase subtree).
const OP_STACK_GAS_PRICE_ORACLE_ADDRESS = "0x420000000000000000000000000000000000000F" as const

const getL1FeeAbi = parseAbi(["function getL1Fee(bytes memory _data) view returns (uint256)"])

const getOpStackEthL1DataFee = async (
  publicClient: PublicClient,
  serializedTx: Hex
): Promise<bigint> => {
  try {
    const contract = getContract({
      address: OP_STACK_GAS_PRICE_ORACLE_ADDRESS,
      abi: getL1FeeAbi,
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
      abi: getL1FeeAbi,
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
  const evmNetwork = useNetworkById(publicClient?.chain?.id?.toString(), "ethereum")

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
      if (!publicClient?.chain?.id || !serialized || !evmNetwork) return null

      switch (evmNetwork.l2FeeType?.type) {
        case "op-stack":
          return getOpStackEthL1DataFee(publicClient, serialized)
        case "scroll":
          return getScrollStackEthL1DataFee(
            publicClient,
            serialized,
            evmNetwork.l2FeeType.l1GasPriceOracle
          )
        default:
          return 0n
      }
    },
    placeholderData: keepPreviousData,
    refetchInterval: 6_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: !!publicClient?.chain?.id && !!serialized,
  })
}
