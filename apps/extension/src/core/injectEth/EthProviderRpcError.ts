// 4001	User Rejected Request	The user rejected the request.
// 4100	Unauthorized	        The requested method and/or account has not been authorized by the user.
// 4200	Unsupported Method	    The Provider does not support the requested method.
// 4900	Disconnected	        The Provider is disconnected from all chains.
// 4901	Chain Disconnected	    The Provider is not connected to the requested chain.
//
// 4900 is intended to indicate that the Provider is disconnected from all chains, while 4901 is intended to indicate that the Provider is disconnected from a specific chain only.
// In other words, 4901 implies that the Provider is connected to other chains, just not the requested one.

// https://eips.ethereum.org/EIPS/eip-1193#provider-errors
export const ETH_ERROR_EIP1993_USER_REJECTED = 4001
export const ETH_ERROR_EIP1993_UNAUTHORIZED = 4100
export const ETH_ERROR_EIP1993_UNSUPPORTED_METHOD = 4200
export const ETH_ERROR_EIP1993_DISCONNECTED = 4900
export const ETH_ERROR_EIP1993_CHAIN_DISCONNECTED = 4901

// https://eips.ethereum.org/EIPS/eip-1474#error-codes
export const ETH_ERROR_EIP1474_PARSE_ERROR = -32700
export const ETH_ERROR_EIP1474_INVALID_REQUEST = -32600
export const ETH_ERROR_EIP1474_METHOD_NOT_FOUND = -32601
export const ETH_ERROR_EIP1474_INVALID_PARAMS = -32602
export const ETH_ERROR_EIP1474_INTERNAL_ERROR = -32603
export const ETH_ERROR_EIP1474_INVALID_INPUT = -32000
export const ETH_ERROR_EIP1474_RESOURCE_NOT_FOUND = -32001
export const ETH_ERROR_EIP1474_RESOURCE_UNAVAILABLE = -32002
export const ETH_ERROR_EIP1474_TRANSACTION_REJECTED = -32003
export const ETH_ERROR_EIP1474_METHOD_NOT_SUPPORTED = -32004
export const ETH_ERROR_EIP1474_LIMIT_EXCEEDED = -32005
export const ETH_ERROR_EIP1474_RPC_VERSION_NOT_SUPPORTED = -32006

export const ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED = 4902

export class EthProviderRpcError extends Error {
  code: number
  message: string
  data?: unknown //hex encoded error or underlying error object

  constructor(message: string, code: number, data?: unknown) {
    super(message)

    this.code = code
    this.message = message
    this.data = data

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, EthProviderRpcError.prototype)
  }
}

/**
 * Wrapped error so viem doesn't see the "data" property
 */
export class WrappedEthProviderRpcError extends Error {
  code: number
  message: string
  rpcData?: unknown //hex encoded error or underlying error object

  constructor(message: string, code: number, rpcData?: unknown) {
    super(message)

    this.code = code
    this.message = message
    this.rpcData = rpcData

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, WrappedEthProviderRpcError.prototype)
  }
}
