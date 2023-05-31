import { copySeedStoreToVaultCompanion } from "@core/domains/accounts/helpers"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { provideContext } from "@talisman/util/provideContext"
import { decodeAnyAddress } from "@talismn/util"
import { sleep } from "@talismn/util"
import { api } from "@ui/api"
import { useQrCodeAccounts } from "@ui/hooks/useQrCodeAccounts"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useHasVaultCompanion } from "@ui/hooks/useVaultCompanionMnemonic"
import { useReducer, useState } from "react"
import { useCallback } from "react"

type VaultAccountConfigBase = {
  name: string
  address: string
  genesisHash: string | null
  lockToNetwork: boolean
  companionType?: "talisman" | "new" | null
  companionMnemonic?: string
}

type VaultAccountConfigNewCompanion = VaultAccountConfigBase & {
  companionType: "new"
  companionMnemonic: string
}

type VaultAccountConfigTalismanCompanion = VaultAccountConfigBase & {
  companionType: "talisman"
}

type VaultAccountConfigNoCompanion = VaultAccountConfigBase & {
  companionType: null
}

type VaultAccountConfig =
  | VaultAccountConfigNewCompanion
  | VaultAccountConfigBase
  | VaultAccountConfigTalismanCompanion
  | VaultAccountConfigNoCompanion

export type CONFIGURE_STATE = {
  type: "CONFIGURE"
  name: string
  address: string
  genesisHash: string | null
  lockToNetwork: boolean
  submitting?: true
}

export type CONFIGURE_COMPANION_STATE = {
  type: "CONFIGURE_COMPANION"
  submitting?: true
}

type AddQrState =
  | { type: "SCAN"; enable: boolean; cameraError?: string; scanError?: string }
  | CONFIGURE_STATE
  | CONFIGURE_COMPANION_STATE

type Action =
  | { method: "enableScan" }
  | { method: "setScanError"; error: string }
  | { method: "setCameraError"; error: string }
  | { method: "onScan"; scanned?: { content: string; genesisHash: string; isAddress: boolean } }
  | { method: "setName"; name: string }
  | { method: "setLockToNetwork"; lockToNetwork: boolean }
  | { method: "setSubmitting" }
  | { method: "setSubmittingFailed" }
  | { method: "setConfigureCompanion" }
  | { method: "setCompanionType"; companionType: "talisman" | "new" | null }

export const reducer = (state: AddQrState, action: Action): AddQrState => {
  if (state.type === "SCAN") {
    if (action.method === "enableScan") return { type: "SCAN", enable: true }
    if (action.method === "setScanError")
      return { type: "SCAN", enable: false, scanError: action.error }
    if (action.method === "setCameraError")
      return { type: "SCAN", enable: false, cameraError: action.error }

    if (action.method === "onScan") {
      const scanned = action.scanned

      if (!scanned) return state
      if (!scanned.isAddress)
        return { type: "SCAN", enable: true, scanError: "QR code is not valid" }

      const { content: address, genesisHash } = scanned

      if (decodeAnyAddress(address).byteLength !== 32)
        return { type: "SCAN", enable: true, scanError: "QR code contains an invalid address" }
      if (!genesisHash.startsWith("0x"))
        return { type: "SCAN", enable: true, scanError: "QR code contains an invalid genesisHash" }

      return {
        type: "CONFIGURE",
        name: "",
        address,
        genesisHash,
        lockToNetwork: false,
      }
    }
  }

  if (state.type === "CONFIGURE") {
    if (action.method === "setName") return { ...state, type: "CONFIGURE", name: action.name }
    if (action.method === "setLockToNetwork")
      return { ...state, type: "CONFIGURE", lockToNetwork: action.lockToNetwork }
    if (action.method === "setSubmitting") return { ...state, submitting: true }
    if (action.method === "setSubmittingFailed") return { ...state, submitting: undefined }
    if (action.method === "setConfigureCompanion")
      return { type: "CONFIGURE_COMPANION", submitting: undefined }
  }

  if (state.type === "CONFIGURE_COMPANION") {
    if (action.method === "setSubmitting") return { ...state, submitting: true }
    if (action.method === "setSubmittingFailed") return { ...state, submitting: undefined }
  }

  return state
}

const initialState: AddQrState = { type: "SCAN", enable: false }

const useAccountAddQrContext = () => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [configuration, setConfiguration] = useState<VaultAccountConfig>()
  const hasVaultCompanion = useHasVaultCompanion()
  const vaultAccounts = useQrCodeAccounts()

  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  const submit = useCallback(async () => {
    if (state.type !== "CONFIGURE" && state.type !== "CONFIGURE_COMPANION") return
    if (state.submitting) return
    if (!configuration) return

    dispatch({ method: "setSubmitting" })

    const notificationId = notify(
      {
        type: "processing",
        title: "Creating account",
        subtitle: "Please wait",
      },
      { autoClose: false }
    )

    // pause to prevent double notification
    await sleep(1000)

    const { name, address, genesisHash, lockToNetwork, companionType } = configuration

    if (companionType === "talisman") {
      await copySeedStoreToVaultCompanion()
    } else if (companionType === "new" && configuration.companionMnemonic) {
      await api.setVaultCompanionMnemonic(configuration.companionMnemonic)
    }

    try {
      setAddress(
        await api.accountCreateQr(
          name || "My Polkadot Vault Account",
          address,
          lockToNetwork ? genesisHash : null
        )
      )
      notifyUpdate(notificationId, {
        type: "success",
        title: "Account created",
        subtitle: name,
      })
    } catch (error) {
      dispatch({ method: "setSubmittingFailed" })
      notifyUpdate(notificationId, {
        type: "error",
        title: "Error creating account",
        subtitle: (error as Error)?.message,
      })
    }
  }, [setAddress, configuration, state])

  const submitConfigure = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (state.type !== "CONFIGURE") return
      // save the configuration state to the context to be used in submit
      setConfiguration(state)
      // if there are already vault accounts, they can just submit straight away
      if (vaultAccounts.length > 0) return submit()
      // if there is already a vault companion, they can just submit straight away
      if (hasVaultCompanion) return submit()
      // otherwise, dispatch to setConfigureCompanion
      dispatch({ method: "setConfigureCompanion" })
    },
    [submit, state, hasVaultCompanion, vaultAccounts]
  )

  const setCompanionType = useCallback(
    ({
      companionType,
      companionMnemonic,
    }: {
      companionType: "talisman" | "new" | null
      companionMnemonic?: string
    }) => {
      setConfiguration((configuration) => {
        if (!configuration)
          throw new Error("Configuration details must be set before setting companion type")
        return {
          ...configuration,
          companionType,
          companionMnemonic,
        }
      })
    },
    []
  )

  return { state, dispatch, submitConfigure, setCompanionType, submit }
}

export const [AccountAddQrProvider, useAccountAddQr] = provideContext(useAccountAddQrContext)
