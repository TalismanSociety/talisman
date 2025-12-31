import { isAddressEqual } from "@talismn/crypto"
import { useCallback, useEffect, useMemo, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useAccounts, useConfirmedAddresses } from "@ui/state"

import { useSendFunds } from "./useSendFunds"

const useExternalAddressWarningProvider = () => {
  const { to, token, network } = useSendFunds()
  const accounts = useAccounts("owned")
  const confirmedAddresses = useConfirmedAddresses()

  const [isWarningAcknowledged, setIsWarningAcknowledged] = useState(false)
  const [dontRemindAgain, setDontRemindAgain] = useState(false)

  const isAlreadyConfirmed = useMemo(() => {
    if (!token?.id || !to) return false
    const confirmedForToken = confirmedAddresses[token.id] ?? []
    return confirmedForToken.some((addr) => isAddressEqual(addr, to))
  }, [confirmedAddresses, token?.id, to])

  const warningType = useMemo<"none" | "alpha" | "network">(() => {
    if (!network || !token || !to) return "none"
    if (isAlreadyConfirmed) return "none"

    const isAlpha = token.type === "substrate-dtao"
    const isOwnedTo = accounts.some((account) => isAddressEqual(account.address, to))
    if (isOwnedTo) return "none"
    return isAlpha ? "alpha" : "network"
  }, [network, token, to, accounts, isAlreadyConfirmed])

  useEffect(() => {
    setIsWarningAcknowledged(false)
    setDontRemindAgain(false)
  }, [to, token?.id])

  const canConfirm = useMemo(() => {
    switch (warningType) {
      case "none":
        return true
      case "alpha":
      case "network":
        return isWarningAcknowledged
    }
  }, [warningType, isWarningAcknowledged])

  const saveConfirmation = useCallback(() => {
    if (dontRemindAgain && token?.id && to) {
      api.addConfirmedAddress(token.id, to)
    }
  }, [dontRemindAgain, token?.id, to])

  return {
    warningType,
    isWarningAcknowledged,
    setIsWarningAcknowledged,
    dontRemindAgain,
    setDontRemindAgain,
    canConfirm,
    saveConfirmation,
  }
}

// provider is designed to wrap the confirm form, so it resets if the user goes back
export const [ExternalAddressWarningProvider, useExternalAddressWarning] = provideContext(
  useExternalAddressWarningProvider,
)
