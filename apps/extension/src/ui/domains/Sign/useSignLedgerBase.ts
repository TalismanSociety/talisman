import { useCallback, useState } from "react"

import { TalismanLedgerError } from "@ui/hooks/ledger/errors"

export const useSignLedgerBase = () => {
  const [{ isSigning, error }, setState] = useState<{
    isSigning: boolean
    error: TalismanLedgerError | null
  }>({ isSigning: false, error: null })

  const setError = useCallback((error: TalismanLedgerError | null) => {
    setState({ isSigning: false, error })
  }, [])

  const setIsSigning = useCallback((isSigning: boolean) => {
    setState({ isSigning, error: null })
  }, [])

  return { setError, setIsSigning, isSigning, error }
}
