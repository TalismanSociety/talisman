import { isAddressEqual } from "@talismn/crypto"
import { useMemo, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { useAccounts } from "@ui/state"

import { useSendFunds } from "./useSendFunds"

const useExternalAddressWarningProvider = () => {
  const { to, token, network } = useSendFunds()
  const accounts = useAccounts("owned")

  const [isWarningAcknowledged, setIsWarningAcknowledged] = useState(false)

  const warningType = useMemo<"none" | "alpha" | "network">(() => {
    if (!network || !token || !to) return "none"
    const isAlpha = token.type === "substrate-dtao"
    const isOwnedTo = accounts.some((account) => isAddressEqual(account.address, to))
    if (isOwnedTo) return "none"
    return isAlpha ? "alpha" : "network"
  }, [network, token, to, accounts])

  const canConfirm = useMemo(() => {
    switch (warningType) {
      case "none":
        return true
      case "alpha":
      case "network":
        return isWarningAcknowledged
    }
  }, [warningType, isWarningAcknowledged])

  return {
    warningType,
    isWarningAcknowledged,
    setIsWarningAcknowledged,
    canConfirm,
  }
}

// provider is designed to wrap the confirm form, so it resets if the user goes back
export const [ExternalAddressWarningProvider, useExternalAddressWarning] = provideContext(
  useExternalAddressWarningProvider,
)
