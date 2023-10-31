import {
  parseRpcTransactionRequestBase,
  serializeTransactionRequest,
} from "@core/domains/ethereum/helpers"
// import { rebuildTransactionRequestNumbers } from "@core/domains/ethereum/helpers"
// import {
//   parseRpcTransactionRequestBase,
//   parseTransactionRequest,
// } from "@core/domains/ethereum/viemMigration"
import { KnownSigningRequestIdOnly } from "@core/domains/signing/types"
import { log } from "@core/log"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useRequest } from "@ui/hooks/useRequest"
import { useCallback, useMemo, useState } from "react"

import { useAnySigningRequest } from "./AnySignRequestContext"

const useEthSignTransactionRequestProvider = ({ id }: KnownSigningRequestIdOnly<"eth-send">) => {
  const signingRequest = useRequest(id)
  const network = useEvmNetwork(signingRequest?.ethChainId)

  const txBase = useMemo(
    () => (signingRequest ? parseRpcTransactionRequestBase(signingRequest.request) : undefined),
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
    errorDetails,
    networkUsage,
    gasSettingsByPriority,
    setCustomSettings,
    isValid,
  } = useEthTransaction(txBase, signingRequest?.ethChainId, isPayloadLocked)

  const baseRequest = useAnySigningRequest({
    currentRequest: signingRequest,
    approveSignFn: api.ethApproveSignAndSend,
    cancelSignFn: api.ethCancelSign,
  })

  const approve = useCallback(() => {
    if (!baseRequest) throw new Error("Missing base request")
    if (!transaction) throw new Error("Missing transaction")
    const serialized = serializeTransactionRequest(transaction)
    return baseRequest && baseRequest.approve(serialized)
  }, [baseRequest, transaction])

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      if (!baseRequest || !transaction || !baseRequest.id) return
      baseRequest.setStatus.processing("Approving request")
      try {
        const serialized = serializeTransactionRequest(transaction)
        await api.ethApproveSignAndSendHardware(baseRequest.id, serialized, signature)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve hardware", { err })
        baseRequest.setStatus.error((err as Error).message)
      }
    },
    [baseRequest, transaction]
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
    transaction,
    transactionInfo,
    approve,
    approveHardware,
    isPayloadLocked,
    setIsPayloadLocked,
    gasSettingsByPriority,
    setCustomSettings,
    isValid,
  }
}

export const [EthSignTransactionRequestProvider, useEthSignTransactionRequest] = provideContext(
  useEthSignTransactionRequestProvider
)
