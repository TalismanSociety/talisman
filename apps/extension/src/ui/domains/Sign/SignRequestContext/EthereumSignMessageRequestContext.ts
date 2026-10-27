import { log } from "@common/log"
import { parseSiweMessage } from "@core/domains/ethereum/siwe"
import type { KnownSigningRequestIdOnly } from "@core/domains/signing/types"
import type { HexString } from "@talismn/util"
import { getErrorMessage } from "@talismn/util"
import { api } from "@ui/api"
import { useSignInDomainMismatch } from "@ui/domains/Sign/hooks/useSignInDomainMismatch"
import { useEvmMessageRiskAnalysis } from "@ui/domains/Sign/risk-analysis/ethereum/useEvmMessageRiskAnalysis"
import { useOriginFromUrl } from "@ui/hooks/useOriginFromUrl"
import { useNetworkById } from "@ui/state/chaindata"
import { useRequest } from "@ui/state/requests"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useAnySigningRequest } from "./useAnySigningRequest"

const useEthSignMessageRequestProvider = ({ id }: KnownSigningRequestIdOnly<"eth-sign">) => {
  const request = useRequest(id)
  const network = useNetworkById(request?.ethChainId, "ethereum")
  const { t } = useTranslation()

  // wraps status and errors management
  const baseRequest = useAnySigningRequest({
    currentRequest: request,
    approveSignFn: api.ethApproveSign,
    cancelSignFn: api.ethCancelSign,
  })

  const origin = useOriginFromUrl(request?.url)

  const riskAnalysis = useEvmMessageRiskAnalysis({
    networkId: request?.ethChainId,
    method: request?.method,
    params: request?.params,
    account: request?.account?.address,
    origin,
  })

  const reject = useCallback(() => {
    return baseRequest.reject()
  }, [baseRequest])

  const approve = useCallback(() => {
    if (
      riskAnalysis.review.isRiskAcknowledgementRequired &&
      !riskAnalysis.review.isRiskAcknowledged
    )
      return riskAnalysis.review.drawer.open()
    return baseRequest.approve()
  }, [baseRequest, riskAnalysis])

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      if (
        riskAnalysis.review.isRiskAcknowledgementRequired &&
        !riskAnalysis.review.isRiskAcknowledged
      )
        return riskAnalysis.review.drawer.open()

      if (!baseRequest?.id) return

      baseRequest.setStatus.processing("Approving request")
      try {
        await api.ethApproveSignHardware(baseRequest.id, signature)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve hardware", { err })
        baseRequest.fail(err, getErrorMessage(err, t("Unknown error")))
      }
    },
    [baseRequest, riskAnalysis, t]
  )

  const siweDomain = useMemo(
    () =>
      request?.method === "personal_sign" ? parseSiweMessage(request.request)?.domain : undefined,
    [request]
  )
  const signInDomainMismatch = useSignInDomainMismatch(siweDomain, request?.url)

  const isValid = useMemo(() => {
    if (!request) return false

    if (signInDomainMismatch.isBlocking) return false

    const isTypedData = Boolean(request?.method?.startsWith("eth_signTypedData"))
    if (isTypedData) {
      // for now only check signTypedData's verifying contract's address
      const typedMessage = isTypedData ? JSON.parse(request.request) : undefined
      const verifyingContract = typedMessage?.domain?.verifyingContract as string | undefined
      if (verifyingContract?.toLowerCase().startsWith("javascript:")) return false
    }

    return true
  }, [request, signInDomainMismatch.isBlocking])

  return {
    ...baseRequest,
    reject,
    approve,
    approveHardware,
    request,
    network,
    isValid,
    signInDomainMismatch,
    riskAnalysis,
  }
}

export const [EthSignMessageRequestProvider, useEthSignMessageRequest] = provideContext(
  useEthSignMessageRequestProvider
)
