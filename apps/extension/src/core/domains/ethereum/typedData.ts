import { ETH_ERROR_EIP1474_INVALID_PARAMS, EthProviderRpcError } from "./EthProviderRpcError"

type TypedDataDomainTypes = Record<string, { name?: unknown }[] | undefined>

// dapps encode the domain's uint256 chainId as a number, a decimal string or a hex string
const parseDomainChainId = (chainId: unknown) => {
  if (typeof chainId === "number") return chainId
  if (typeof chainId === "bigint") return Number(chainId)
  if (typeof chainId === "string" && chainId.trim()) return Number(chainId)
  return Number.NaN
}

// only the fields the domain type declares end up in the domain separator, so a chainId it leaves
// out isn't signed and tells us nothing about the chain the signature is valid on
const isChainIdSigned = (types: TypedDataDomainTypes | undefined) =>
  Array.isArray(types?.EIP712Domain) && types.EIP712Domain.some((f) => f?.name === "chainId")

export const getTypedDataDomainChainId = (message: string) => {
  try {
    const { types, domain } = JSON.parse(message) as {
      types?: TypedDataDomainTypes
      domain?: { chainId?: unknown }
    }

    if (!isChainIdSigned(types)) return undefined

    // a declared chainId the domain leaves out doesn't name this chain, whatever the signer encodes
    if (domain?.chainId === undefined || domain.chainId === null) return 0

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
