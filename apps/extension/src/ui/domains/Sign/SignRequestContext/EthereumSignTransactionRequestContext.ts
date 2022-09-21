import { rebuildTransactionRequestNumbers } from "@core/domains/ethereum/helpers"
import { EthSignAndSendRequest } from "@core/domains/signing/types"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useEvmTransaction } from "@ui/domains/Asset/Send/useEvmTransaction"
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

  const { transaction, txDetails, priority, setPriority, isLoading, error } = useEvmTransaction(
    transactionRequest,
    "low"
  )

  const baseRequest = useAnySigningRequest<EthSignAndSendRequest>({
    currentRequest: signingRequest,
    approveSignFn: api.ethApproveSignAndSend,
    cancelSignFn: api.ethCancelSign,
  })

  const approve = useCallback(() => {
    return baseRequest.approve(transaction)
  }, [baseRequest, transaction])

  return {
    ...baseRequest,
    txDetails,
    priority,
    setPriority,
    approve,
    isLoading,
    error,
    network,
    transaction,
  }
}

export const [EthSignTransactionRequestProvider, useEthSignTransactionRequest] = provideContext(
  useEthSignTransactionRequestProvider
)
