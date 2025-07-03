import {
  Abi,
  Client,
  ContractFunctionExecutionError,
  getContract,
  hexToString,
  parseAbi,
} from "viem"

const NAME_ABI_METHOD = "function name() view returns (string)"
const DECIMALS_ABI_METHOD = "function decimals() view returns (uint8)"
const ABI_ERC20 = [
  "function symbol() view returns (string)",
  DECIMALS_ABI_METHOD,
  NAME_ABI_METHOD,
] as const

const PARSED_ABI_ERC20 = parseAbi(ABI_ERC20)

const ABI_ERC20_BYTES_SYMBOL = [
  "function symbol() view returns (bytes32)",
  "function name() view returns (bytes32)",
  DECIMALS_ABI_METHOD,
] as const

const PARSED_ABI_ERC20_BYTES_SYMBOL = parseAbi(ABI_ERC20_BYTES_SYMBOL)

export type Erc20ContractData = {
  symbol: string
  decimals: number
  name: string
}

const getErc20Contract =
  (client: Client, contractAddress: `0x${string}`) =>
  <TAbi extends Abi>(abi: TAbi) =>
    getContract({
      address: contractAddress,
      abi,
      client: { public: client },
    })

export const getErc20ContractData = async (
  client: Client,
  contractAddress: `0x${string}`,
): Promise<Erc20ContractData> => {
  const getEr20ContractFn = getErc20Contract(client, contractAddress)

  try {
    const contract = getEr20ContractFn(PARSED_ABI_ERC20)

    // eslint-disable-next-line no-var
    var [symbol, decimals, name] = await Promise.all([
      contract.read.symbol(),
      contract.read.decimals(),
      contract.read.name(),
    ])
  } catch (e) {
    if (e instanceof ContractFunctionExecutionError) {
      // try to perform the contract read with bytes32 symbol
      const contract = getEr20ContractFn(PARSED_ABI_ERC20_BYTES_SYMBOL)

      // eslint-disable-next-line no-var
      var [bytesSymbol, decimals, nameSymbol] = await Promise.all([
        contract.read.symbol(),
        contract.read.decimals(),
        contract.read.name(),
      ])
      symbol = hexToString(bytesSymbol).replace(/\0/g, "").trim() // remove NULL characters
      name = hexToString(nameSymbol).replace(/\0/g, "").trim() // remove NULL characters
    } else {
      throw e
    }
  }

  return { symbol, decimals, name }
}
