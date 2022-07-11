import { DEFAULT_ETH_CHAIN_ID } from "@core/constants"
import type { AuthorizeRequest } from "@core/types"
import useSet from "@talisman/hooks/useSet"
import { api } from "@ui/api"
import { useCallback, useEffect, useMemo, useState } from "react"

import useAccounts from "./useAccounts"
import { useAuthRequests } from "./useAuthRequests"

interface IProps {
  onError: (msg: string) => void
  onRejection: (msg: string) => void
  onIgnore: (msg: string) => void
  onSuccess: () => void
}

const useCurrentAuthorisationRequest = ({ onSuccess, onError, onRejection, onIgnore }: IProps) => {
  const [currentRequest, setCurrentRequest] = useState<AuthorizeRequest>()
  const allAccounts = useAccounts()
  const { items: connected, toggle, set } = useSet<string>()
  const authRequests = useAuthRequests()
  const ethereum = !!currentRequest?.request.ethereum
  const [chainId, setChainId] = useState(DEFAULT_ETH_CHAIN_ID) // Default to moonbeam

  const accounts = useMemo(
    () =>
      allAccounts.filter(({ type }) => !currentRequest?.request.ethereum || type === "ethereum"),
    [allAccounts, currentRequest?.request.ethereum]
  )
  const canIgnore = useMemo(() => !currentRequest?.request.ethereum, [currentRequest])

  useEffect(() => {
    if (authRequests[0]) {
      setCurrentRequest(authRequests[0])
    }
  }, [authRequests, setCurrentRequest, onError])

  const authorise = useCallback(() => {
    api.authrequestApprove(currentRequest?.id as string, connected, ethereum ? chainId : undefined)
    onSuccess()
  }, [currentRequest?.id, connected, ethereum, chainId, onSuccess])

  const reject = useCallback(() => {
    api.authrequestReject(currentRequest?.id as string)
    onRejection("Auth request rejected")
  }, [currentRequest?.id, onRejection])

  const ignore = useCallback(() => {
    api.authrequestIgnore(currentRequest?.id as string)
    onIgnore("Auth request ignored")
  }, [currentRequest?.id, onIgnore])

  return {
    request: currentRequest,
    accounts: accounts.map((account) => ({
      ...account,
      toggle: () => (ethereum ? set([account?.address]) : toggle(account?.address)),
      approved: connected.includes(account?.address),
    })),
    connected,
    canIgnore,
    authorise,
    reject,
    ignore,
    chainId,
    setChainId,
    ethereum,
  }
}

export default useCurrentAuthorisationRequest
