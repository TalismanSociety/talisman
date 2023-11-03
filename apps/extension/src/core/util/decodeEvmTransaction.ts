import {
  PublicClient,
  TransactionRequestBase,
  decodeFunctionData,
  getAbiItem,
  getContract,
  parseAbi,
} from "viem"

import { abiErc1155, abiErc20, abiErc721, abiMoonStaking } from "./abi"
import { abiMoonConvictionVoting } from "./abi/abiMoonConvictionVoting"
import { abiMoonXTokens } from "./abi/abiMoonXTokens"
import { isContractAddress } from "./isContractAddress"

const KNOWN_ABI = {
  ERC20: parseAbi(abiErc20),
  ERC721: parseAbi(abiErc721),
  ERC1155: parseAbi(abiErc1155),
  MoonStaking: abiMoonStaking,
  MoonConvictionVoting: abiMoonConvictionVoting,
  MoonXTokens: abiMoonXTokens,
  unknown: null,
} as const

export type ContractType = keyof typeof KNOWN_ABI

const MOON_CHAIN_PRECOMPILES = [
  {
    address: "0x0000000000000000000000000000000000000800",
    contractType: "MoonStaking",
    abi: abiMoonStaking,
  },
  {
    address: "0x0000000000000000000000000000000000000812",
    contractType: "MoonConvictionVoting",
    abi: abiMoonConvictionVoting,
  },
  {
    address: "0x0000000000000000000000000000000000000804",
    contractType: "MoonXTokens",
    abi: abiMoonXTokens,
  },
] as const

const STANDARD_CONTRACTS = [
  {
    contractType: "ERC20",
    abi: parseAbi(abiErc20),
  },
  {
    contractType: "ERC721",
    abi: parseAbi(abiErc721),
  },
  {
    contractType: "ERC1155",
    abi: parseAbi(abiErc1155),
  },
] as const

export const decodeEvmTransaction = async <TContractType extends ContractType>(
  publicClient: PublicClient,
  tx: TransactionRequestBase
) => {
  // transactions that provision a contract have an empty 'to' field
  const { to: targetAddress, value, data } = tx

  const isContractCall = targetAddress
    ? await isContractAddress(publicClient, targetAddress)
    : false

  if (isContractCall && data && targetAddress) {
    // moon chains precompiles
    if (publicClient.chain?.id && [1284, 1285, 1287].includes(publicClient.chain.id)) {
      for (const { address, contractType, abi } of MOON_CHAIN_PRECOMPILES) {
        if (address === targetAddress) {
          //const { contractType, abi } = precompile
          const contractCall = decodeFunctionData({ abi, data })
          return {
            contractType: contractType as TContractType,
            contractCall,
            targetAddress,
            isContractCall: true,
            value,
            abi,
          }
        }
      }
    }

    // common contracts
    for (const { contractType, abi } of STANDARD_CONTRACTS) {
      try {
        if (contractType === "ERC20") {
          const contractCall = decodeFunctionData({ abi, data })

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

          return {
            contractType: contractType as TContractType,
            contractCall,
            abi,
            targetAddress,
            isContractCall: true,
            value,
            asset: { name, symbol, decimals },
          }
        }
        if (contractType === "ERC721") {
          const contractCall = decodeFunctionData({ abi, data })

          const abiItem = getAbiItem({
            abi,
            args: contractCall.args,
            name: contractCall.functionName,
          })
          const tokenIdIndex = abiItem.inputs.findIndex((input) => input.name === "tokenId")
          const tokenId =
            tokenIdIndex > -1 ? (contractCall.args?.[tokenIdIndex] as bigint) : undefined

          const contract = getContract({
            address: targetAddress,
            abi: KNOWN_ABI.ERC721,
            publicClient,
          })

          // some calls may fail as not all NFTs implement the metadata functions
          const [name, symbol, tokenURI] = await Promise.allSettled([
            contract.read.name(),
            contract.read.symbol(),
            tokenId ? contract.read.tokenURI([tokenId]) : undefined,
          ])

          const asset = [name.status, symbol.status, tokenURI].includes("fulfilled")
            ? {
                name: name.status === "fulfilled" ? name.value : undefined,
                symbol: symbol.status === "fulfilled" ? symbol.value : undefined,
                tokenId,
                tokenURI: tokenURI.status === "fulfilled" ? tokenURI.value : undefined,
                decimals: 1,
              }
            : undefined

          return {
            contractType: contractType as TContractType,
            contractCall,
            abi,
            targetAddress,
            isContractCall: true,
            value,
            asset,
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return { contractType: "unknown" as TContractType, targetAddress, isContractCall, value }
}

export type DecodedEvmTransaction = Awaited<ReturnType<typeof decodeEvmTransaction>>
