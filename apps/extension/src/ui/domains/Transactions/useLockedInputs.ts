import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import type { ScaleApiSubmitMode } from "@talismn/sapi"
import { useLockedValue } from "@ui/hooks/useLockedValue"
import { type PayloadLockListener, useReportPayloadLock } from "@ui/hooks/useReportPayloadLock"
import { useCallback, useMemo, useState } from "react"

type LockedInputs = {
  payload: SignerPayloadJSON | undefined
  shortMetadata?: `0x${string}` | undefined
  txInfo?: WalletTransactionInfo | undefined
  txMode?: ScaleApiSubmitMode | undefined
}

export const useLockedInputs = (
  { payload, shortMetadata, txInfo, txMode }: LockedInputs,
  onPayloadLockChange?: PayloadLockListener
) => {
  const memoizedInputs = useMemo(
    () => ({
      payload,
      shortMetadata,
      txInfo,
      txMode,
    }),
    [payload, shortMetadata, txInfo, txMode]
  )

  const [isLocked, setIsLockedState] = useState(false)
  const lockedInputs = useLockedValue<LockedInputs>(memoizedInputs, isLocked)

  const reportPayloadLock = useReportPayloadLock(onPayloadLockChange)

  const setIsLocked = useCallback(
    (locked: boolean) => {
      setIsLockedState(locked)
      reportPayloadLock(locked)
    },
    [reportPayloadLock]
  )

  return { setIsLocked, lockedInputs }
}
