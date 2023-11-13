import ContractsJson from "./ContractsAddresses.json"
import GreeterJson from "./Greeter.json"

export const GreeterAbi = GreeterJson

export const getGreeterAddress = (chainId?: number): `0x${string}` | undefined => {
  try {
    const key = String(chainId) as keyof typeof ContractsJson
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (ContractsJson[key] as any)?.Greeter?.address as `0x${string}`
  } catch (err) {
    return undefined
  }
}

export const getUSDCAddress = (chainId?: number): `0x${string}` | undefined => {
  try {
    const key = String(chainId) as keyof typeof ContractsJson
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (ContractsJson[key] as any)?.USDC?.address as `0x${string}`
  } catch (err) {
    return undefined
  }
}
