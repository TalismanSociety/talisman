import { KnownSigningRequestIdOnly } from "@core/domains/signing/types"
import { log } from "@core/log"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useRequest } from "@ui/hooks/useRequest"
import { useCallback } from "react"

import { useAnySigningRequest } from "./AnySignRequestContext"

const useEthSignMessageRequestProvider = ({ id }: KnownSigningRequestIdOnly<"eth-sign">) => {
  const request = useRequest(id)
  const network = useEvmNetwork(request?.ethChainId)

  // wraps status and errors management
  const baseRequest = useAnySigningRequest({
    currentRequest: request,
    approveSignFn: api.ethApproveSign,
    cancelSignFn: api.ethCancelSign,
  })

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      if (!baseRequest || !baseRequest.id) return
      baseRequest.setStatus.processing("Approving request")
      try {
        await api.ethApproveSignHardware(baseRequest.id, signature)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve hardware", { err })
        baseRequest.setStatus.error((err as Error).message)
      }
    },
    [baseRequest]
  )

  return {
    ...baseRequest,
    approveHardware,
    request,
    network,
  }
}

export const [EthSignMessageRequestProvider, useEthSignMessageRequest] = provideContext(
  useEthSignMessageRequestProvider
)
