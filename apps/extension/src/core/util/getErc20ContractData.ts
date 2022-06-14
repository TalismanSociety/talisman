import { ethers } from "ethers"

const ABI_ERC20 = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]

export type Erc20ContractData = {
  symbol: string
  decimals: number
}

export const getErc20ContractData = async (
  provider: ethers.providers.JsonRpcProvider,
  contractAddress: string
): Promise<Erc20ContractData> => {
  const erc20 = new ethers.Contract(contractAddress, ABI_ERC20, provider)
  const [symbol, decimals] = await Promise.all([erc20.symbol(), erc20.decimals()])
  return { symbol, decimals }
}
