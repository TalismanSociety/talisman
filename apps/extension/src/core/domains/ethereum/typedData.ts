import { ETH_ERROR_EIP1474_INVALID_PARAMS, EthProviderRpcError } from "./EthProviderRpcError"

// dapps encode the domain's uint256 chainId as a number, a decimal string or a hex string
const parseDomainChainId = (chainId: unknown) => {
  if (typeof chainId === "number") return chainId
  if (typeof chainId === "bigint") return Number(chainId)
  if (typeof chainId === "string" && chainId.trim()) return Number(chainId)
  return Number.NaN
}

export const getTypedDataDomainChainId = (message: string) => {
  try {
    const { domain } = JSON.parse(message) as { domain?: { chainId?: unknown } }
    // a domain without a chainId isn't bound to any chain, there is nothing to check
    if (domain?.chainId === undefined || domain.chainId === null) return undefined

    return parseDomainChainId(domain.chainId)
  } catch {
    // not json, or not typed data - signing it will fail later on
    return undefined
  }
}

// an EIP-712 signature is only valid on the chain named by its domain, so signing a domain that names
// another chain would authorize an operation on a network the site isn't connected to. Mirrors the
// check the transaction path already makes on `chainId`.
export const assertTypedDataTargetsChain = (message: string, chainId: number) => {
  const domainChainId = getTypedDataDomainChainId(message)

  if (domainChainId !== undefined && domainChainId !== chainId)
    throw new EthProviderRpcError("Wrong network", ETH_ERROR_EIP1474_INVALID_PARAMS)
}
