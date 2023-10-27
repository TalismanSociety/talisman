import { EvmAddress } from "@core/domains/ethereum/types"
import * as Sentry from "@sentry/browser"
import { getContractCallArg } from "@ui/domains/Sign/Ethereum/getContractCallArg"
import { BigNumber, ethers } from "ethers"
import { PublicClient, getAddress, getContract, parseAbi } from "viem"

import { abiErc1155, abiErc20, abiErc721, abiMoonStaking } from "./abi"
import { abiMoonConvictionVoting } from "./abi/abiMoonConvictionVoting"
import { abiMoonXTokens } from "./abi/abiMoonXTokens"
import { isContractAddress } from "./isContractAddress"

export type ContractType =
  | "ERC20"
  | "ERC721"
  | "ERC1155"
  | "MoonXTokens"
  | "MoonStaking"
  | "MoonConvictionVoting"
  | "unknown"

const MOON_CHAIN_PRECOMPILE_ADDRESSES: Record<
  EvmAddress,
  { contractType: ContractType; abi: unknown }
> = {
  "0x0000000000000000000000000000000000000800": {
    contractType: "MoonStaking",
    abi: abiMoonStaking,
  },
  "0x0000000000000000000000000000000000000812": {
    contractType: "MoonConvictionVoting",
    abi: abiMoonConvictionVoting,
  },
  "0x0000000000000000000000000000000000000804": {
    contractType: "MoonXTokens",
    abi: abiMoonXTokens,
  },
}

// note : order may be important here as some contracts may inherit from others
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const knownContracts: { contractType: ContractType; abi: any }[] = [
  {
    contractType: "ERC20",
    abi: abiErc20,
  },
  {
    contractType: "ERC721",
    abi: abiErc721,
  },
  {
    contractType: "ERC1155",
    abi: abiErc1155,
  },
]

const KNOWN_ABI = {
  ERC20: parseAbi(abiErc20),
  ERC721: parseAbi(abiErc721),
  ERC1155: parseAbi(abiErc1155),
  MoonStaking: abiMoonStaking,
  MoonConvictionVoting: abiMoonConvictionVoting,
  MoonXTokens: abiMoonXTokens,
}

export type TransactionInfo = {
  targetAddress?: EvmAddress
  isContractCall: boolean
  value?: bigint
  contractType?: ContractType
  contractCall?: ethers.utils.TransactionDescription
  asset?: {
    name: string
    symbol: string
    decimals: number
    image?: string
    tokenId?: bigint
    tokenURI?: string
  }
}
export type KnownTransactionInfo = Required<TransactionInfo>

export const getEthTransactionInfo = async (
  publicClient: PublicClient,
  tx: ethers.providers.TransactionRequest
): Promise<TransactionInfo | undefined> => {
  // transactions that provision a contract have an empty 'to' field
  const targetAddress = tx.to ? getAddress(tx.to) : undefined

  const isContractCall = targetAddress
    ? await isContractAddress(publicClient, targetAddress)
    : false

  const result: TransactionInfo = {
    targetAddress,
    isContractCall,
    contractType: isContractCall ? "unknown" : undefined,
    value: tx.value ? BigNumber.from(tx.value).toBigInt() : undefined,
  }

  // moon chains precompiles
  if (
    tx.data &&
    targetAddress &&
    tx.chainId &&
    [1284, 1285, 1287].includes(tx.chainId) &&
    !!MOON_CHAIN_PRECOMPILE_ADDRESSES[targetAddress]
  ) {
    const { contractType, abi } = MOON_CHAIN_PRECOMPILE_ADDRESSES[targetAddress]
    try {
      const data = ethers.utils.hexlify(tx.data)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contractInterface = new ethers.utils.Interface(abi as any)
      // error will be thrown here if contract doesn't match the abi
      const contractCall = contractInterface.parseTransaction({ data, value: tx.value })
      result.contractType = contractType
      result.contractCall = contractCall

      return result
    } catch (err) {
      Sentry.captureException(err, { extra: { to: tx.to, chainId: tx.chainId } })
    }
  }

  if (targetAddress && tx.data) {
    const data = ethers.utils.hexlify(tx.data)

    for (const { contractType, abi } of knownContracts) {
      try {
        const contractInterface = new ethers.utils.Interface(abi)

        // TODO find a way to parse method arguments without ethers
        // error will be thrown here if contract doesn't match the abi
        const contractCall = contractInterface.parseTransaction({ data, value: tx.value })
        result.contractType = contractType
        result.contractCall = contractCall

        if (contractType === "ERC20") {
          const contract = getContract({
            address: targetAddress,
            abi: KNOWN_ABI.ERC20,
            publicClient,
          })

          const [name, symbol, decimals] = await Promise.all([
            contract.read.name(),
            contract.read.symbol(),
            contract.read.decimals(),
          ])

          result.asset = {
            name,
            symbol,
            decimals,
          }
        } else if (contractType === "ERC721") {
          const tokenId = getContractCallArg<BigNumber>(contractCall, "tokenId")!.toBigInt()

          try {
            const contract = getContract({
              address: targetAddress,
              abi: KNOWN_ABI.ERC721,
              publicClient,
            })
            const [name, symbol, tokenURI] = await Promise.all([
              contract.read.name(),
              contract.read.symbol(),
              tokenId ? contract.read.tokenURI([tokenId]) : undefined,
            ])

            result.asset = { name, symbol, tokenId, tokenURI, decimals: 1 }
          } catch (err) {
            // some NFTs don't implement the metadata functions
          }
        }

        return result
      } catch (err) {
        // transaction doesn't match this contract interface
      }
    }
  }

  return result
}
