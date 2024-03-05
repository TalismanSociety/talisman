import { AnyEthSigningRequest, AnySigningRequest, SigningRequests } from "../domains/signing/types"

export const isEthereumRequest = (
  signingRequest: AnySigningRequest
): signingRequest is AnyEthSigningRequest => {
  return (
    (signingRequest as AnyEthSigningRequest).type !== undefined &&
    ["eth-sign", "eth-send"].includes((signingRequest as AnyEthSigningRequest).type)
  )
}

export const isSigningType = <T extends keyof SigningRequests>(
  signingRequest: SigningRequests[T][0],
  type: T
) => {
  return signingRequest.type === type
}
