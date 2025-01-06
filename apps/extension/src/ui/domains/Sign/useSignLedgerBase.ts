import { useCallback, useEffect, useState } from "react"

import { TalismanLedgerError } from "@ui/hooks/ledger/errors"

export const useSignLedgerBase = ({ payload }: { payload: unknown }) => {
  const [{ isSigning, error }, setState] = useState<{
    isSigning: boolean
    error: TalismanLedgerError | null
  }>({ isSigning: false, error: null })

  // reset
  useEffect(() => {
    setState({ isSigning: false, error: null })
  }, [payload])

  const setError = useCallback((error: TalismanLedgerError | null) => {
    setState({ isSigning: false, error })
  }, [])

  const setIsSigning = useCallback((isSigning: boolean) => {
    setState({ isSigning, error: null })
  }, [])

  return { setError, setIsSigning, isSigning, error }
}
