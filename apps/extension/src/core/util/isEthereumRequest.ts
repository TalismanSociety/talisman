import { AnySigningRequest, EthBaseSignRequest } from "@core/types"

export const isEthereumRequest = (
  signingRequest: AnySigningRequest
): signingRequest is EthBaseSignRequest => {
  return (
    (signingRequest as EthBaseSignRequest).type !== undefined &&
    (signingRequest as EthBaseSignRequest).type === "ethereum"
  )
}
