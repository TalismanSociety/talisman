import { HexString } from "@polkadot/util/types"
import {
  KnownSigningRequestIdOnly,
  parseRpcTransactionRequestBase,
  serializeTransactionRequest,
} from "extension-core"
import { log } from "extension-shared"
import { useCallback, useMemo, useRef, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { useEvmTransactionRiskAnalysis } from "@ui/domains/Sign/risk-analysis/ethereum/useEvmTransactionRiskAnalysis"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEnableTokens } from "@ui/hooks/useEnableTokens"
import { useOriginFromUrl } from "@ui/hooks/useOriginFromUrl"
import { useBalancesHydrate, useNetworkById, useRequest } from "@ui/state"

import { useAnySigningRequest } from "./AnySignRequestContext"

const useEthSignTransactionRequestProvider = ({ id }: KnownSigningRequestIdOnly<"eth-send">) => {
  useBalancesHydrate() // preload
  const { genericEvent } = useAnalytics()
  const signingRequest = useRequest(id)
  const network = useNetworkById(signingRequest?.ethChainId, "ethereum")
  const { enableTokens } = useEnableTokens()

  const txBase = useMemo(
    () => (signingRequest ? parseRpcTransactionRequestBase(signingRequest.request) : undefined),
    [signingRequest],
  )

  // once the payload is sent to ledger, we must freeze it
  const [isPayloadLocked, setIsPayloadLocked] = useState(false)

  const {
    decodedTx,
    transaction,
    txDetails,
    priority,
    setPriority,
    isLoading,
    error,
    errorDetails,
    networkUsage,
    gasSettingsByPriority,
    setCustomSettings,
    isValid,
    updateCallArg,
  } = useEthTransaction(txBase, signingRequest?.ethChainId, isPayloadLocked)

  const origin = useOriginFromUrl(signingRequest?.url)

  const riskAnalysis = useEvmTransactionRiskAnalysis({
    networkId: signingRequest?.ethChainId,
    tx: txBase,
    origin,
  })

  const baseRequest = useAnySigningRequest({
    currentRequest: signingRequest,
    approveSignFn: api.ethApproveSignAndSend,
    cancelSignFn: api.ethCancelSign,
  })

  const reject = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => {
      genericEvent("sign request cancel click", {
        networkType: "evm",
        type: "message",
        network: network?.id,
        riskAnalysisAction: riskAnalysis.validationResult,
        origin,
      })

      baseRequest.reject(...args)
    },
    [baseRequest, origin, genericEvent, network?.id, riskAnalysis],
  )

  // flag to prevent capturing multiple submit attempts
  const refIsApproveCaptured = useRef(false)

  const approve = useCallback(async () => {
    if (
      riskAnalysis.review.isRiskAcknowledgementRequired &&
      !riskAnalysis.review.isRiskAcknowledged
    )
      return riskAnalysis.review.drawer.open()

    if (!refIsApproveCaptured.current) {
      refIsApproveCaptured.current = true
      genericEvent("sign request approve click", {
        networkType: "evm",
        type: "message",
        network: network?.id,
        riskAnalysisAction: riskAnalysis.validationResult,
        origin,
      })
    }

    if (!baseRequest) throw new Error("Missing base request")
    if (!transaction) throw new Error("Missing transaction")
    const serialized = serializeTransactionRequest(transaction)

    await enableTokens(riskAnalysis.tokenIds)
    return baseRequest && baseRequest.approve(serialized)
  }, [riskAnalysis, baseRequest, transaction, enableTokens, genericEvent, network?.id, origin])

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      if (
        riskAnalysis.review.isRiskAcknowledgementRequired &&
        !riskAnalysis.review.isRiskAcknowledged
      )
        return riskAnalysis.review.drawer.open()

      if (!baseRequest || !transaction || !baseRequest.id) return

      if (!refIsApproveCaptured.current) {
        refIsApproveCaptured.current = true
        genericEvent("sign request approve click", {
          networkType: "evm",
          type: "message",
          network: network?.id,
          riskAnalysisAction: riskAnalysis.validationResult,
          origin,
        })
      }

      baseRequest.setStatus.processing("Approving request")
      try {
        const serialized = serializeTransactionRequest(transaction)

        await enableTokens(riskAnalysis.tokenIds)
        await api.ethApproveSignAndSendHardware(baseRequest.id, serialized, signature)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve hardware", { err })
        baseRequest.setStatus.error((err as Error).message)
        setIsPayloadLocked(false)
      }
    },
    [baseRequest, riskAnalysis, transaction, origin, network?.id, enableTokens, genericEvent],
  )

  return {
    ...baseRequest,
    txDetails,
    priority,
    setPriority,
    isLoading,
    error,
    errorDetails,
    network,
    networkUsage,
    decodedTx,
    transaction,
    reject,
    approve,
    approveHardware,
    isPayloadLocked,
    setIsPayloadLocked,
    gasSettingsByPriority,
    setCustomSettings,
    isValid,
    updateCallArg,
    riskAnalysis,
  }
}

export const [EthSignTransactionRequestProvider, useEthSignTransactionRequest] = provideContext(
  useEthSignTransactionRequestProvider,
)
