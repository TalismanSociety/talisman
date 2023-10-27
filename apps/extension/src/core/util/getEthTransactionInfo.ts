import * as Sentry from "@sentry/browser"
import { getContractCallArg } from "@ui/domains/Sign/Ethereum/getContractCallArg"
import { BigNumber, ethers } from "ethers"

import { abiErc1155, abiErc20, abiErc721, abiErc721Metadata, abiMoonStaking } from "./abi"
import { abiMoonConvictionVoting } from "./abi/abiMoonConvictionVoting"
import { abiMoonXTokens } from "./abi/abiMoonXTokens"
import { isContractAddressOld } from "./isContractAddress"

export type ContractType =
  | "ERC20"
  | "ERC721"
  | "ERC1155"
  | "MoonXTokens"
  | "MoonStaking"
  | "MoonConvictionVoting"
  | "unknown"

const MOON_CHAIN_PRECOMPILE_ADDRESSES: Record<
  string,
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

export type TransactionInfo = {
  targetAddress?: string
  isContractCall: boolean
  value?: BigNumber
  contractType?: ContractType
  contractCall?: ethers.utils.TransactionDescription
  asset?: {
    name: string
    symbol: string
    decimals: number
    image?: string
    tokenId?: BigNumber
    tokenURI?: string
  }
}
export type KnownTransactionInfo = Required<TransactionInfo>

export const getEthTransactionInfo = async (
  provider: ethers.providers.Provider,
  tx: ethers.providers.TransactionRequest
): Promise<TransactionInfo | undefined> => {
  // transactions that provision a contract have an empty 'to' field
  const targetAddress = tx.to ? ethers.utils.getAddress(tx.to) : undefined

  const isContractCall = targetAddress ? await isContractAddressOld(provider, targetAddress) : false

  const result: TransactionInfo = {
    targetAddress,
    isContractCall,
    contractType: isContractCall ? "unknown" : undefined,
    value: tx.value ? BigNumber.from(tx.value) : undefined,
  }

  // moon chains precompiles
  if (
    tx.data &&
    tx.to &&
    tx.chainId &&
    [1284, 1285, 1287].includes(tx.chainId) &&
    !!MOON_CHAIN_PRECOMPILE_ADDRESSES[tx.to]
  ) {
    const { contractType, abi } = MOON_CHAIN_PRECOMPILE_ADDRESSES[tx.to]
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

        // error will be thrown here if contract doesn't match the abi
        const contractCall = contractInterface.parseTransaction({ data, value: tx.value })
        result.contractType = contractType
        result.contractCall = contractCall

        if (contractType === "ERC20") {
          const contract = new ethers.Contract(targetAddress, contractInterface, provider)
          const [name, symbol, decimals] = await Promise.all([
            contract.name(),
            contract.symbol(),
            contract.decimals(),
          ])

          result.asset = { name, symbol, decimals }
        } else if (contractType === "ERC721") {
          const tokenId = getContractCallArg<BigNumber>(contractCall, "tokenId")

          try {
            const contract = new ethers.Contract(targetAddress, abiErc721Metadata, provider)
            const [name, symbol, tokenURI] = await Promise.all([
              contract.name(),
              contract.symbol(),
              tokenId ? contract.tokenURI(tokenId) : undefined,
            ])

            result.asset = {
              name,
              symbol,
              tokenId,
              tokenURI,
              decimals: 1,
            }
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
