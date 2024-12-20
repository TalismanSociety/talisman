import { useCallback, useEffect, useState } from "react"

import { TalismanLedgerError } from "@ui/hooks/ledger/errors"

type SignLedgerStatus = "ready" | "signing" | "signed"

export const useSignLedgerBase = ({ payload }: { payload: unknown }) => {
  const [{ status, error }, setState] = useState<{
    status: SignLedgerStatus
    error: TalismanLedgerError | null
  }>({ status: "ready", error: null })

  // reset
  useEffect(() => {
    setState({ status: "ready", error: null })
  }, [payload])

  const setError = useCallback((error: TalismanLedgerError | null) => {
    setState({ status: "ready", error })
  }, [])

  const setStatus = useCallback((status: SignLedgerStatus) => {
    setState({ status, error: null })
  }, [])

  return { setError, setStatus, status, error }
}
