import { EthSignRequest } from "@core/domains/signing/types"
import { log } from "@core/log"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useSigningRequestById from "@ui/hooks/useSigningRequestById"
import { useCallback } from "react"

import { useAnySigningRequest } from "./AnySignRequestContext"

const useEthSignMessageRequestProvider = ({ id }: { id: string }) => {
  const request = useSigningRequestById(id) as EthSignRequest | undefined
  const network = useEvmNetwork(request?.ethChainId)

  // wraps status and errors management
  const baseRequest = useAnySigningRequest<EthSignRequest>({
    currentRequest: request,
    approveSignFn: api.ethApproveSign,
    cancelSignFn: api.ethCancelSign,
  })

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      baseRequest.setStatus.processing("Approving request")
      if (!baseRequest || !baseRequest.id) return
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
