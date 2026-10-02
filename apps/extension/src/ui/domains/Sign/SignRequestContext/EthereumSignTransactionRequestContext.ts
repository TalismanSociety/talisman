import { log } from "@common/log"
import {
  parseRpcTransactionRequestBase,
  serializeTransactionRequest,
} from "@core/domains/ethereum/helpers"
import type { KnownSigningRequestIdOnly } from "@core/domains/signing/types"
import type { HexString } from "@talismn/util"
import { getErrorMessage } from "@talismn/util"
import { api } from "@ui/api"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { useEvmTransactionRiskAnalysis } from "@ui/domains/Sign/risk-analysis/ethereum/useEvmTransactionRiskAnalysis"
import { useEnableTokens } from "@ui/hooks/useEnableTokens"
import { useOriginFromUrl } from "@ui/hooks/useOriginFromUrl"
import { useBalancesHydrate } from "@ui/state/balances"
import { useNetworkById } from "@ui/state/chaindata"
import { useRequest } from "@ui/state/requests"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { useAnySigningRequest } from "./useAnySigningRequest"

const useEthSignTransactionRequestProvider = ({ id }: KnownSigningRequestIdOnly<"eth-send">) => {
  useBalancesHydrate() // preload
  const { t } = useTranslation()
  const signingRequest = useRequest(id)
  const network = useNetworkById(signingRequest?.ethChainId, "ethereum")
  const { enableTokens } = useEnableTokens()

  const txBase = useMemo(
    () => (signingRequest ? parseRpcTransactionRequestBase(signingRequest.request) : undefined),
    [signingRequest]
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
    errorCategory: txErrorCategory,
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

  const reject = useCallback(() => {
    return baseRequest.reject()
  }, [baseRequest])

  const approve = useCallback(async () => {
    if (
      riskAnalysis.review.isRiskAcknowledgementRequired &&
      !riskAnalysis.review.isRiskAcknowledged
    )
      return riskAnalysis.review.drawer.open()

    if (!baseRequest) throw new Error("Missing base request")
    if (!transaction) throw new Error("Missing transaction")
    const serialized = serializeTransactionRequest(transaction)

    await enableTokens(riskAnalysis.tokenIds)
    return baseRequest?.approve(serialized)
  }, [riskAnalysis, baseRequest, transaction, enableTokens])

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      if (
        riskAnalysis.review.isRiskAcknowledgementRequired &&
        !riskAnalysis.review.isRiskAcknowledged
      )
        return riskAnalysis.review.drawer.open()

      if (!baseRequest || !transaction || !baseRequest.id) return

      baseRequest.setStatus.processing("Approving request")
      try {
        const serialized = serializeTransactionRequest(transaction)

        await enableTokens(riskAnalysis.tokenIds)
        await api.ethApproveSignAndSendHardware(baseRequest.id, serialized, signature)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve hardware", { err })
        baseRequest.fail(err, getErrorMessage(err, t("Unknown error")))
        setIsPayloadLocked(false)
      }
    },
    [baseRequest, riskAnalysis, transaction, enableTokens, t]
  )

  return {
    ...baseRequest,
    txDetails,
    priority,
    setPriority,
    isLoading,
    error,
    errorDetails,
    txErrorCategory,
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
  useEthSignTransactionRequestProvider
)
