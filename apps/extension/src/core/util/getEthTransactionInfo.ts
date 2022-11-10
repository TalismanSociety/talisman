import { BigNumber, BigNumberish, ethers } from "ethers"
import { abiErc1155, abiErc20, abiErc721 } from "./abi"

export type ContractType = "ERC20" | "ERC721" | "ERC20" | "unknown"

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
    contractType: "ERC20",
    abi: abiErc1155,
  },
]

const isContractAddress = async (provider: ethers.providers.Provider, address: string) => {
  try {
    const code = await provider.getCode(address)
    return code !== "0x"
  } catch (error) {
    // if it comes here, then it's not a contract.
    return false
  }
}

export type TransactionInfo = {
  targetAddress: string
  isContractCall: boolean
  value?: BigNumber
  contractType?: ContractType
  contractCall?: ethers.utils.TransactionDescription
  asset?: { name: string; symbol: string; decimals: number; image?: string }
}
export type KnownTransactionInfo = Required<TransactionInfo>

export const getEthTransactionInfo = async (
  provider?: ethers.providers.Provider,
  tx?: ethers.providers.TransactionRequest
): Promise<TransactionInfo | undefined> => {
  if (!provider || !tx?.to) return undefined

  const targetAddress = ethers.utils.getAddress(tx.to)

  const isContractCall = await isContractAddress(provider, targetAddress)

  const result: TransactionInfo = {
    targetAddress,
    isContractCall,
    contractType: isContractCall ? "unknown" : undefined,
    value: tx.value ? BigNumber.from(tx.value) : undefined,
  }

  if (tx.data) {
    const data = ethers.utils.hexlify(tx.data)

    for (const { contractType, abi } of knownContracts) {
      try {
        const contractInterface = new ethers.utils.Interface(abi)

        // error will be thrown here if contract doesn't match the abi
        const contractCall = contractInterface.parseTransaction({ data, value: tx.value })

        const contract = new ethers.Contract(targetAddress, contractInterface, provider)
        const [name, symbol, decimals] = await Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
        ])

        result.contractType = contractType
        result.contractCall = contractCall
        result.asset = { name, symbol, decimals }

        return result
      } catch (err) {
        // transaction doesn't match this contract interface
      }
    }
  }

  return result
}
