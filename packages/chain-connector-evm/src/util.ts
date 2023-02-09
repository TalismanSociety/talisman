import { ethers } from "ethers"

import { RPC_HEALTHCHECK_TIMEOUT } from "./constants"
import { EvmJsonRpcBatchProvider } from "./EvmJsonRpcBatchProvider"
import log from "./log"

export const throwAfter = (ms: number, reason: any = "timeout") =>
  new Promise((_, reject) => setTimeout(() => reject(reason), ms))

/**
 * Helper function to add our onfinality api key to a public onfinality RPC url.
 */
export const addOnfinalityApiKey = (rpcUrl: string, onfinalityApiKey?: string) => {
  if (typeof onfinalityApiKey !== "string") return rpcUrl

  // inject api key here because we don't want them in the store (user can modify urls of rpcs)
  return rpcUrl
    .replace(
      /^https:\/\/([A-z-]+)\.api\.onfinality\.io\/public-ws\/?$/,
      `https://$1.api.onfinality.io/ws?apikey=${onfinalityApiKey}`
    )
    .replace(
      /^https:\/\/([A-z-]+)\.api\.onfinality\.io\/rpc\/?$/,
      `https://$1.api.onfinality.io/rpc?apikey=${onfinalityApiKey}`
    )
}

export const isHealthyRpc = async (url: string, chainId: number) => {
  try {
    // StaticJsonRpcProvider is better suited for this as it will not do health check requests on it's own
    const provider = new ethers.providers.StaticJsonRpcProvider(url, {
      chainId,
      name: `EVM Network ${chainId}`,
    })

    // check that RPC responds in time
    const rpcChainId = await Promise.race([
      provider.send("eth_chainId", []),
      throwAfter(RPC_HEALTHCHECK_TIMEOUT),
    ])

    // with expected chain id
    return parseInt(rpcChainId, 16) === chainId
  } catch (err) {
    log.error("Unhealthy EVM RPC %s", url, { err })
    return false
  }
}

export const getHealthyRpc = async (rpcUrls: string[], network: ethers.providers.Network) => {
  for (const rpcUrl of rpcUrls) if (await isHealthyRpc(rpcUrl, network.chainId)) return rpcUrl

  log.warn("No healthy RPC for EVM network %s (%d)", network.name, network.chainId)
  return null
}

export const isUnhealthyRpcError = (err: any) => {
  // expected errors that are not related to RPC health
  // ex : throw revert on a transaction call that fails
  if (err?.message === "BATCH_FAILED") return false
  if (err?.reason === "processing response error") return false

  // if unknown, assume RPC is unhealthy
  return true
}

export class StandardRpcProvider extends ethers.providers.JsonRpcProvider {
  async send(method: string, params: Array<any>): Promise<any> {
    try {
      return await super.send(method, params)
    } catch (err) {
      // emit error so rpc manager considers this rpc unhealthy
      if (isUnhealthyRpcError(err)) this.emit("error", err)
      throw err
    }
  }
}

export class BatchRpcProvider extends EvmJsonRpcBatchProvider {
  async send(method: string, params: Array<any>): Promise<any> {
    try {
      return await super.send(method, params)
    } catch (err) {
      // emit error so rpc manager considers this rpc unhealthy
      if (isUnhealthyRpcError(err)) this.emit("error", err)
      throw err
    }
  }
}
