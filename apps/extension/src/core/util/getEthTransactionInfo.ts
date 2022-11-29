import { getContractCallArg } from "@ui/domains/Ethereum/Sign/getContractCallArg"
import { BigNumber, ethers } from "ethers"
import { abiErc1155, abiErc20, abiErc721, abiErc721Metadata } from "./abi"
import { isContractAddress } from "./isContractAddress"

export type ContractType = "ERC20" | "ERC721" | "ERC1155" | "unknown"

// note : order may be important here as some contracts may inherit from others
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

  const isContractCall = targetAddress ? await isContractAddress(provider, targetAddress) : false

  const result: TransactionInfo = {
    targetAddress,
    isContractCall,
    contractType: isContractCall ? "unknown" : undefined,
    value: tx.value ? BigNumber.from(tx.value) : undefined,
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
