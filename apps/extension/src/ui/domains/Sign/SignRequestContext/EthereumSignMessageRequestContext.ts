import { KnownSigningRequestIdOnly } from "@extension/core"
import { log } from "@extension/shared"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useEvmMessageRiskAnalysis } from "@ui/domains/Sign/Ethereum/riskAnalysis"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useOriginFromUrl } from "@ui/hooks/useOriginFromUrl"
import { useRequest } from "@ui/hooks/useRequest"
import { useCallback, useMemo, useRef } from "react"

import { useAnySigningRequest } from "./AnySignRequestContext"

const useEthSignMessageRequestProvider = ({ id }: KnownSigningRequestIdOnly<"eth-sign">) => {
  const request = useRequest(id)
  const network = useEvmNetwork(request?.ethChainId)
  const { genericEvent } = useAnalytics()

  // wraps status and errors management
  const baseRequest = useAnySigningRequest({
    currentRequest: request,
    approveSignFn: api.ethApproveSign,
    cancelSignFn: api.ethCancelSign,
  })

  const origin = useOriginFromUrl(request?.url)

  const riskAnalysis = useEvmMessageRiskAnalysis({
    evmNetworkId: request?.ethChainId,
    method: request?.method,
    message: request?.request,
    account: request?.account?.address,
    origin,
  })

  const reject = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => {
      genericEvent("sign request cancel click", {
        networkType: "evm",
        type: "transaction",
        network: network?.id,
        riskAnalysisAction: riskAnalysis?.result?.action,
        origin,
      })

      baseRequest.reject(...args)
    },
    [baseRequest, origin, genericEvent, network?.id, riskAnalysis?.result]
  )

  // flag to prevent capturing multiple submit attempts
  const refIsApproveCaptured = useRef(false)

  const approve = useCallback(() => {
    if (riskAnalysis.review.isRiskAknowledgementRequired && !riskAnalysis.review.isRiskAknowledged)
      return riskAnalysis.review.drawer.open()

    if (!refIsApproveCaptured.current) {
      refIsApproveCaptured.current = true
      genericEvent("sign request approve click", {
        networkType: "evm",
        type: "transaction",
        network: network?.id,
        riskAnalysisAction: riskAnalysis?.result?.action,
        origin,
      })
    }
    return baseRequest.approve()
  }, [
    baseRequest,
    genericEvent,
    network?.id,
    origin,
    riskAnalysis?.result?.action,
    riskAnalysis.review,
  ])

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      if (
        riskAnalysis.review.isRiskAknowledgementRequired &&
        !riskAnalysis.review.isRiskAknowledged
      )
        return riskAnalysis.review.drawer.open()

      if (!baseRequest || !baseRequest.id) return

      if (!refIsApproveCaptured.current) {
        refIsApproveCaptured.current = true
        genericEvent("sign request approve click", {
          networkType: "evm",
          type: "transaction",
          network: network?.id,
          riskAnalysisAction: riskAnalysis?.result?.action,
          origin,
        })
      }

      baseRequest.setStatus.processing("Approving request")
      try {
        await api.ethApproveSignHardware(baseRequest.id, signature)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve hardware", { err })
        baseRequest.setStatus.error((err as Error).message)
      }
    },
    [
      baseRequest,
      riskAnalysis?.result?.action,
      riskAnalysis.review,
      genericEvent,
      network?.id,
      origin,
    ]
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
    reject,
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
