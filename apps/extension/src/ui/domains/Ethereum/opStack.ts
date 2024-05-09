import { gasPriceOracleABI, gasPriceOracleAddress } from "@eth-optimism/contracts-ts"
import { EvmNetworkId } from "extension-core"
import { log } from "extension-shared"
import { Hex, PublicClient, getContract } from "viem"

export const OP_STACK_L1_FEE_ORACLE: Record<number, `0x${string}`> = {
  10: gasPriceOracleAddress[420], // OP Mainnet,
  420: gasPriceOracleAddress[420], // OP Goerli
  7777777: gasPriceOracleAddress[420], // Zora Mainnet
  999: gasPriceOracleAddress[420], // Zora Goerli
  8453: gasPriceOracleAddress[420], // Base Mainnet
  84531: gasPriceOracleAddress[420], // Base Goerli
  534351: "0x5300000000000000000000000000000000000002", // Scroll Sepolia Testnet
  534352: "0x5300000000000000000000000000000000000002", // Scroll Mainnet
  60808: gasPriceOracleAddress[420], // BOB mainnet
  111: gasPriceOracleAddress[420], // BOB testnet
}

export const isOpStackEvmNetwork = (evmNetworkId: EvmNetworkId) => {
  return Number(evmNetworkId) in OP_STACK_L1_FEE_ORACLE
}

export const getOpStackEthL1DataFee = async (
  publicClient: PublicClient,
  serializedTx: Hex
): Promise<bigint> => {
  try {
    const address = (publicClient.chain && OP_STACK_L1_FEE_ORACLE[publicClient.chain.id]) || null
    if (!address) return 0n

    const contract = getContract({
      address,
      abi: gasPriceOracleABI,
      client: { public: publicClient },
    })
    return await contract.read.getL1Fee([serializedTx])
  } catch (err) {
    log.error(err)
    throw new Error("Failed to get L1 data fee", { cause: err })
  }
}
