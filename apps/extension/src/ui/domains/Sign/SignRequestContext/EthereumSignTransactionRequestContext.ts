import { rebuildTransactionRequestNumbers } from "@core/domains/ethereum/helpers"
import { EthSignAndSendRequest } from "@core/domains/signing/types"
import { log } from "@core/log"
import { KnownTransactionInfo } from "@core/util/getEthTransactionInfo"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useSigningRequestById from "@ui/hooks/useSigningRequestById"
import { useCallback, useMemo, useState } from "react"

import { useAnySigningRequest } from "./AnySignRequestContext"

const useEthSignTransactionRequestProvider = ({ id }: { id: string }) => {
  const signingRequest = useSigningRequestById(id) as EthSignAndSendRequest | undefined
  const network = useEvmNetwork(signingRequest?.ethChainId)

  const transactionRequest = useMemo(
    () => (signingRequest ? rebuildTransactionRequestNumbers(signingRequest.request) : undefined),
    [signingRequest]
  )

  // once the payload is sent to ledger, we must freeze it
  const [isPayloadLocked, setIsPayloadLocked] = useState(false)

  const {
    transaction,
    transactionInfo,
    txDetails,
    priority,
    setPriority,
    isLoading,
    error,
    networkUsage,
    gasSettingsByPriority,
    setCustomSettings,
  } = useEthTransaction(transactionRequest, "low", isPayloadLocked)

  const baseRequest = useAnySigningRequest<EthSignAndSendRequest>({
    currentRequest: signingRequest,
    approveSignFn: api.ethApproveSignAndSend,
    cancelSignFn: api.ethCancelSign,
  })

  const approve = useCallback(() => {
    return baseRequest.approve(transaction)
  }, [baseRequest, transaction])

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      baseRequest.setStatus.processing("Approving request")
      if (!baseRequest || !baseRequest.id) return
      try {
        await api.ethApproveSignAndSendHardware(baseRequest.id, signature)
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
    txDetails,
    priority,
    setPriority,
    isLoading,
    error,
    network,
    networkUsage,
    transaction,
    transactionInfo,
    approve,
    approveHardware,
    isPayloadLocked,
    setIsPayloadLocked,
    gasSettingsByPriority,
    setCustomSettings,
  }
}

export const [EthSignTransactionRequestProvider, useEthSignTransactionRequest] = provideContext(
  useEthSignTransactionRequestProvider
)
