import Transport from "@ledgerhq/hw-transport"
import TransportWebHID from "@ledgerhq/hw-transport-webhid"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import { sleep } from "@talismn/util"
import { LedgerTransportType } from "extension-core"
import { log } from "extension-shared"
import { useCallback, useEffect, useRef } from "react"

import { useSettingValue } from "@ui/state"
import { getIsLedgerCapable } from "@ui/util/getIsLedgerCapable"

import { getTalismanLedgerError } from "./errors"

const LEDGER_IN_PROGRESS_ERROR = "An operation that changes interface state is in progress."

const IS_USB_SUPPORTED = getIsLedgerCapable("usb")
const IS_HID_SUPPORTED = getIsLedgerCapable("hid")

const safelyCreateTransport = async (type: LedgerTransportType, attempt = 1) => {
  if (attempt > 5) throw getTalismanLedgerError("Unable to connect to Ledger")

  try {
    switch (type) {
      case "usb":
        return await TransportWebUSB.create()
      case "hid":
        return await TransportWebHID.create()
    }
  } catch (err) {
    // in onboarding wizards, might need to wait for previous page/component to finish closing previous transport
    if ((err as Error).message.includes(LEDGER_IN_PROGRESS_ERROR)) {
      await sleep(200) // it should be almost instant but just in case, wait 1 second max (5 x 200ms)
      return safelyCreateTransport(type, attempt + 1)
    }
    throw getTalismanLedgerError(err)
  }
}

const createTransport = async (type: LedgerTransportType): Promise<Transport> => {
  try {
    if (IS_USB_SUPPORTED && IS_HID_SUPPORTED) {
      return await safelyCreateTransport(type)
    } else if (IS_HID_SUPPORTED) {
      return await safelyCreateTransport("hid")
    } else if (IS_USB_SUPPORTED) {
      return await safelyCreateTransport("usb")
    }

    throw getTalismanLedgerError("Ledger is not supported on your browser.")
  } catch (err) {
    throw getTalismanLedgerError(err)
  }
}

export const useLedgerTransport = () => {
  const transportType = useSettingValue("ledgerTransportType")
  const refTransport = useRef<Transport | null>(null)

  const ensureTransport = useCallback(async () => {
    if (!refTransport.current) {
      refTransport.current = await createTransport(transportType)
      refTransport.current.on("disconnect", () => {
        refTransport.current = null
      })
    }

    return refTransport.current!
  }, [transportType])

  const closeTransport = useCallback(async () => {
    if (!refTransport.current) return

    try {
      await refTransport.current.close()
    } catch (err) {
      log.error("Failed to close transport", { err })
    } finally {
      refTransport.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      refTransport.current?.close().catch((err) => {
        log.error("Failed to close transport on unmount", { err })
      })
    }
  }, [])

  return { ensureTransport, closeTransport }
}
