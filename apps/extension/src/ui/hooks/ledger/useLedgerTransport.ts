import Transport from "@ledgerhq/hw-transport"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import { log } from "extension-shared"
import { useCallback, useEffect, useRef } from "react"

import { getIsLedgerCapable } from "@ui/util/getIsLedgerCapable"

const LEDGER_IN_PROGRESS_ERROR = "An operation that changes interface state is in progress."

const safelyCreateTransport = async (attempt = 1): Promise<Transport> => {
  if (!getIsLedgerCapable()) throw new Error("Ledger is not supported on your browser.")

  if (attempt > 5) throw new Error("Unable to connect to Ledger")
  try {
    return await TransportWebUSB.create()
  } catch (e) {
    if ((e as Error).message.includes(LEDGER_IN_PROGRESS_ERROR)) {
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt))
      return await safelyCreateTransport(attempt + 1)
    } else throw e
  }
}

const safelyCloseTransport = async (transport: Transport | null, attempt = 1): Promise<void> => {
  if (attempt > 5) throw new Error("Unable to disconnect Ledger")
  try {
    await transport?.close()
  } catch (e) {
    if ((e as Error).message.includes(LEDGER_IN_PROGRESS_ERROR)) {
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt))
      return await safelyCloseTransport(transport, attempt + 1)
    } else throw e
  }
}

export const useLedgerTransport = () => {
  const refTransport = useRef<Transport | null>(null)

  const ensureTransport = useCallback(async () => {
    if (!refTransport.current) {
      refTransport.current = await safelyCreateTransport()
      refTransport.current.on("disconnect", () => {
        refTransport.current = null
      })
    }

    return refTransport.current!
  }, [])

  const closeTransport = useCallback(async () => {
    if (!refTransport.current) return

    await safelyCloseTransport(refTransport.current)
    refTransport.current = null
  }, [])

  useEffect(() => {
    return () => {
      if (refTransport.current) safelyCloseTransport(refTransport.current).catch(log.error)
    }
  }, [])

  return { ensureTransport, closeTransport }
}
