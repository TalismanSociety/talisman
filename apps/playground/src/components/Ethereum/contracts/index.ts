import GreeterJson from "./Greeter.json"
export * from "./types"
export * from "./types/common"
import DeploymentsJson from "./Deployments.json"
import { ethers } from "ethers"

export const GreeterAbi = GreeterJson

export const getGreeterAddress = (chainId?: number) => {
  try {
    const key = String(chainId) as keyof typeof DeploymentsJson
    return DeploymentsJson[key].Greeter.address
  } catch (err) {
    return null
  }
}
