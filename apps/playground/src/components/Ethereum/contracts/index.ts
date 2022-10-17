import GreeterJson from "./Greeter.json"
export * from "./types"
export * from "./types/common"
import ContractsJson from "./ContractsAddresses.json"

export const GreeterAbi = GreeterJson

export const getGreeterAddress = (chainId?: number): string | null => {
  try {
    const key = String(chainId) as keyof typeof ContractsJson
    return (ContractsJson[key] as any)?.Greeter?.address
  } catch (err) {
    return null
  }
}

export const getUSDCAddress = (chainId?: number): string | null => {
  try {
    const key = String(chainId) as keyof typeof ContractsJson
    return (ContractsJson[key] as any)?.USDC?.address
  } catch (err) {
    return null
  }
}
