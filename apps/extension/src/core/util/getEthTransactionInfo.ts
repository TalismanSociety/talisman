import { EvmAddress } from "@core/domains/ethereum/types"
import { log } from "@core/log"
import * as Sentry from "@sentry/browser"
import { getContractCallArg } from "@ui/domains/Sign/Ethereum/getContractCallArg"
import { BigNumber, ethers } from "ethers"
import {
  PublicClient,
  TransactionRequestBase,
  decodeFunctionData,
  getAbiItem,
  getAddress,
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
//type KnownAbi<T extends ContractType> = T extends "unknown" ? never : (typeof KNOWN_ABI)[T]

// export type ContractType =
//   | "ERC20"
//   | "ERC721"
//   | "ERC1155"
//   | "MoonXTokens"
//   | "MoonStaking"
//   | "MoonConvictionVoting"
//   | "unknown"

// type MoonbeamPrecompileDef<TContractType extends ContractType> = Record<
//   EvmAddress,
//   | {
//       contractType: TContractType
//       abi: KnownAbi<TContractType>
//     }
//   | undefined
// >

// const MOON_CHAIN_PRECOMPILE_ADDRESSES_2 = {
//   "0x0000000000000000000000000000000000000800": {
//     contractType: "MoonStaking",
//     abi: abiMoonStaking,
//   },
//   "0x0000000000000000000000000000000000000812": {
//     contractType: "MoonConvictionVoting",
//     abi: abiMoonConvictionVoting,
//   },
//   "0x0000000000000000000000000000000000000804": {
//     contractType: "MoonXTokens",
//     abi: abiMoonXTokens,
//   },
// } as const

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

// type ContractAbis = {
//   erc20: ParseAbi<typeof abiErc20>
//   erc721: ParseAbi<typeof abiErc721>
//   erc1155: ParseAbi<typeof abiErc1155>
//   MoonXTokens: typeof abiMoonXTokens
//   MoonStaking: typeof abiMoonStaking
//   abiMoonConvictionVoting: typeof abiMoonConvictionVoting
// }

// type ContractDef<TContractType extends keyof ContractAbis> = {
//   contractType: TContractType
//   abi: ContractAbis[TContractType]
// }

// TODO yeet
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

export type TransactionInfo = {
  targetAddress?: EvmAddress
  isContractCall: boolean
  value?: bigint
  contractType?: ContractType
  contractCall?: ethers.utils.TransactionDescription
  // contractCall2?: DecodeFunctionDataReturnType<KnownAbi<Omit<TContractType, "unknown">>> | never
  asset?: {
    name: string
    symbol: string
    decimals: number
    image?: string
    tokenId?: bigint
    tokenURI?: string
  }
}

// type UnknownTransactionInfo<TContractType extends ContractType | "unknown"> = {
//   contractType: TContractType
//   contractCall: TContractType extends "unknown"
//     ? null
//     : DecodeFunctionDataReturnType<KnownAbi<TContractType>>
//   targetAddress?: EvmAddress
//   isContractCall: boolean
//   value?: bigint

//   // contractCall2?: DecodeFunctionDataReturnType<KnownAbi<Omit<TContractType, "unknown">>> | never
//   asset?: {
//     name: string
//     symbol: string
//     decimals: number
//     image?: string
//     tokenId?: bigint
//     tokenURI?: string
//   }
// }

export type KnownTransactionInfo = Required<TransactionInfo>

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
    }
  }

  return { contractType: "unknown" as TContractType, targetAddress, isContractCall, value }
}

// export type DecodedEvmTransaction<TContractType extends ContractType> = Awaited<
//   ReturnType<typeof decodeEvmTransaction<TContractType>>
//   >

export type DecodedEvmTransaction = Awaited<ReturnType<typeof decodeEvmTransaction>>

/** @deprecated */
export const getEthTransactionInfoOld = async (
  publicClient: PublicClient,
  tx: TransactionRequestBase
): Promise<TransactionInfo> => {
  try {
    const test = await decodeEvmTransaction(publicClient, tx)
    log.log("test", test)
  } catch (err) {
    log.log("failed test", { err })
  }
  // transactions that provision a contract have an empty 'to' field
  const targetAddress = tx.to ? getAddress(tx.to) : undefined

  const isContractCall = targetAddress
    ? await isContractAddress(publicClient, targetAddress)
    : false

  const result: TransactionInfo = {
    targetAddress,
    isContractCall,
    contractType: isContractCall ? "unknown" : undefined,
    //contractType: isContractCall ? "unknown" as const : undefined,
    value: tx.value ? BigNumber.from(tx.value).toBigInt() : undefined,
  }

  // moon chains precompiles
  if (
    tx.data &&
    targetAddress &&
    publicClient?.chain?.id &&
    [1284, 1285, 1287].includes(publicClient.chain.id) &&
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
      Sentry.captureException(err, { extra: { to: tx.to, chainId: publicClient.chain.id } })
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
          const tokenId = getContractCallArg<BigNumber>(contractCall, "tokenId")?.toBigInt()
          if (tokenId) {
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
        }

        return result
      } catch (err) {
        // transaction doesn't match this contract interface
      }
    }
  }

  return result
}
