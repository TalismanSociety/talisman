import type { TalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useCallback, useState } from "react"

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
