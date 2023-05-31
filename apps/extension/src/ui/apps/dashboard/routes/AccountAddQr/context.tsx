import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { provideContext } from "@talisman/util/provideContext"
import { decodeAnyAddress } from "@talismn/util"
import { sleep } from "@talismn/util"
import { api } from "@ui/api"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useReducer } from "react"
import { useCallback } from "react"

export type CONFIGURE_STATE = {
  type: "CONFIGURE"
  name: string
  address: string
  genesisHash: string | null
  lockToNetwork: boolean
  submitting?: true
}

type AddQrState =
  | { type: "SCAN"; enable: boolean; cameraError?: string; scanError?: string }
  | CONFIGURE_STATE

type Action =
  | { method: "enableScan" }
  | { method: "setScanError"; error: string }
  | { method: "setCameraError"; error: string }
  | { method: "onScan"; scanned?: { content: string; genesisHash: string; isAddress: boolean } }
  | { method: "setName"; name: string }
  | { method: "setLockToNetwork"; lockToNetwork: boolean }
  | { method: "setSubmitting" }
  | { method: "setSubmittingFailed" }

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
    if (action.method === "setSubmitting") return { ...state, type: "CONFIGURE", submitting: true }
    if (action.method === "setSubmittingFailed")
      return { ...state, type: "CONFIGURE", submitting: undefined }
  }

  return state
}

const initialState: AddQrState = { type: "SCAN", enable: false }

const useAccountAddQrContext = () => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const { setAddress } = useSelectAccountAndNavigate("/portfolio")
  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (state.type !== "CONFIGURE") return
      if (state.submitting) return

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

      const { name, address, genesisHash, lockToNetwork } = state

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
    },
    [setAddress, state]
  )

  return { state, dispatch, submit }
}

export const [AccountAddQrProvider, useAccountAddQr] = provideContext(useAccountAddQrContext)
