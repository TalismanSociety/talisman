import { Abi, Client, getContract, parseAbi } from "viem"

import { Erc20ContractData, getErc20ContractData } from "./getErc20ContractData"

const ABI_UNISWAPV2PAIR = parseAbi([
  "function decimals() pure returns (uint8)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
])

export type UniswapV2ContractData = {
  symbol: string
  decimals: number
  tokenAddress0: string
  tokenAddress1: string
  token0: Erc20ContractData
  token1: Erc20ContractData
}

export const getUniswapV2ContractData = async (
  client: Client,
  contractAddress: `0x${string}`
): Promise<UniswapV2ContractData> => {
  const getUniswapV2ContractFn = getUniswapV2Contract(client, contractAddress)

  const contract = getUniswapV2ContractFn(ABI_UNISWAPV2PAIR)

  const [decimals, tokenAddress0, tokenAddress1] = await Promise.all([
    contract.read.decimals(),
    contract.read.token0(),
    contract.read.token1(),
  ])

  const [token0, token1] = await Promise.all([
    getErc20ContractData(client, tokenAddress0),
    getErc20ContractData(client, tokenAddress1),
  ])

  const symbol = `${token0.symbol ?? "UNKNOWN"}/${token1.symbol ?? "UNKNOWN"}`

  return { symbol, decimals, tokenAddress0, tokenAddress1, token0, token1 }
}

const getUniswapV2Contract =
  (client: Client, contractAddress: `0x${string}`) =>
  <TAbi extends Abi>(abi: TAbi) =>
    getContract({
      address: contractAddress,
      abi,
      client: { public: client },
    })
