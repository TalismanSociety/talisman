import { ethers } from "ethers"
import { Client, getContract, parseAbi } from "viem"

const ABI_ERC20 = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
] as const

const PARSED_ABI_ERC20 = parseAbi(ABI_ERC20)

export type Erc20ContractData = {
  symbol: string
  decimals: number
}

/**
 * @deprecated use viem
 */
export const getErc20ContractDataOld = async (
  provider: ethers.providers.JsonRpcProvider,
  contractAddress: string
): Promise<Erc20ContractData> => {
  const erc20 = new ethers.Contract(contractAddress, ABI_ERC20, provider)
  const [symbol, decimals] = await Promise.all([erc20.symbol(), erc20.decimals()])
  return { symbol, decimals }
}

export const getErc20ContractData = async (
  client: Client,
  contractAddress: `0x${string}`
): Promise<Erc20ContractData> => {
  const contract = getContract({
    address: contractAddress,
    abi: PARSED_ABI_ERC20,
    publicClient: client,
  })
  const [symbol, decimals] = await Promise.all([contract.read.symbol(), contract.read.decimals()])
  //const [symbol, decimals] = await Promise.all([erc20.symbol(), erc20.decimals()])
  return { symbol, decimals }
}
