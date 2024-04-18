import { KnownSigningRequestIdOnly } from "@extension/core"
import { log } from "@extension/shared"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useEvmMessageRiskAnalysis } from "@ui/domains/Ethereum/useEvmMessageRiskAnalysis"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useRequest } from "@ui/hooks/useRequest"
import { useCallback, useEffect, useMemo } from "react"

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

  const riskAnalysis = useEvmMessageRiskAnalysis(
    request?.ethChainId,
    request?.method,
    request?.request,
    request?.account?.address,
    request?.url
  )

  useEffect(() => {
    // TODO remove
    log.log("blowfish scan", riskAnalysis)
  }, [riskAnalysis])

  const approve = useCallback(() => {
    if (riskAnalysis.review.isRiskAknowledgementRequired && !riskAnalysis.review.isRiskAknowledged)
      return riskAnalysis.review.drawer.open()

    return baseRequest.approve()
  }, [baseRequest, riskAnalysis])

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      if (
        riskAnalysis.review.isRiskAknowledgementRequired &&
        !riskAnalysis.review.isRiskAknowledged
      )
        return riskAnalysis.review.drawer.open()

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
    [baseRequest, riskAnalysis]
  )

  const isValid = useMemo(() => {
    if (!request) return false

    const isTypedData = Boolean(request?.method?.startsWith("eth_signTypedData"))
    if (isTypedData) {
      // for now only check signTypedData's verifying contract's address
      const typedMessage = isTypedData ? JSON.parse(request.request) : undefined
      const verifyingContract = typedMessage?.domain?.verifyingContract as string | undefined
      if (verifyingContract && verifyingContract.toLowerCase().startsWith("javascript:"))
        return false
    }

    return true
  }, [request])

  return {
    ...baseRequest,
    approve,
    approveHardware,
    request,
    network,
    isValid,
    riskAnalysis,
  }
}

export const [EthSignMessageRequestProvider, useEthSignMessageRequest] = provideContext(
  useEthSignMessageRequestProvider
)
