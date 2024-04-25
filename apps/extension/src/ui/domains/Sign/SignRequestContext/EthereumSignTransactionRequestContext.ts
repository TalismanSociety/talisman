import { parseRpcTransactionRequestBase, serializeTransactionRequest } from "@extension/core"
import { KnownSigningRequestIdOnly } from "@extension/core"
import { log } from "@extension/shared"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { balancesHydrateAtom } from "@ui/atoms"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { useEvmTransactionRiskAnalysis } from "@ui/domains/Sign/Ethereum/riskAnalysis"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useRequest } from "@ui/hooks/useRequest"
import { useAtomValue } from "jotai"
import { useCallback, useMemo, useState } from "react"

import { useAnySigningRequest } from "./AnySignRequestContext"

const useEthSignTransactionRequestProvider = ({ id }: KnownSigningRequestIdOnly<"eth-send">) => {
  useAtomValue(balancesHydrateAtom)
  const signingRequest = useRequest(id)
  const network = useEvmNetwork(signingRequest?.ethChainId)

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
    networkUsage,
    gasSettingsByPriority,
    setCustomSettings,
    isValid,
    // riskAnalysis,
    updateCallArg,
  } = useEthTransaction(
    txBase,
    signingRequest?.ethChainId,
    isPayloadLocked
    // false,
    // signingRequest?.url
  )

  const riskAnalysis = useEvmTransactionRiskAnalysis({
    evmNetworkId: signingRequest?.ethChainId,
    tx: transaction,
    url: signingRequest?.url,
  })

  const baseRequest = useAnySigningRequest({
    currentRequest: signingRequest,
    approveSignFn: api.ethApproveSignAndSend,
    cancelSignFn: api.ethCancelSign,
  })

  const approve = useCallback(() => {
    if (riskAnalysis.review.isRiskAknowledgementRequired && !riskAnalysis.review.isRiskAknowledged)
      return riskAnalysis.review.drawer.open()

    if (!baseRequest) throw new Error("Missing base request")
    if (!transaction) throw new Error("Missing transaction")
    const serialized = serializeTransactionRequest(transaction)
    return baseRequest && baseRequest.approve(serialized)
  }, [baseRequest, riskAnalysis, transaction])

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      if (
        riskAnalysis.review.isRiskAknowledgementRequired &&
        !riskAnalysis.review.isRiskAknowledged
      )
        return riskAnalysis.review.drawer.open()

      if (!baseRequest || !transaction || !baseRequest.id) return
      baseRequest.setStatus.processing("Approving request")
      try {
        const serialized = serializeTransactionRequest(transaction)
        await api.ethApproveSignAndSendHardware(baseRequest.id, serialized, signature)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve hardware", { err })
        baseRequest.setStatus.error((err as Error).message)
        setIsPayloadLocked(false)
      }
    },
    [baseRequest, riskAnalysis, transaction]
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
