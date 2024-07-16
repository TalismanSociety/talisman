import { AssetDiscoveryMode } from "@extension/core"
import { VerifierCertificateType } from "@extension/core"
import { HexString } from "@polkadot/util/types"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { provideContext } from "@talisman/util/provideContext"
import { decodeAnyAddress } from "@talismn/util"
import { sleep } from "@talismn/util"
import { api } from "@ui/api"
import { useHasVerifierCertificateMnemonic } from "@ui/hooks/useHasVerifierCertificateMnemonic"
import { useQrCodeAccounts } from "@ui/hooks/useQrCodeAccounts"
import { useReducer } from "react"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import { AccountAddPageProps } from "../types"

type AccountConfigState = {
  name: string
  address: string
  genesisHash: HexString | null
  lockToNetwork: boolean
}

export type CONFIGURE_STATE = {
  type: "CONFIGURE"
  accountConfig: AccountConfigState
  submitting?: true
}

type VerifierCertificateTypeState = VerifierCertificateType | undefined

export type CONFIGURE_VERIFIER_CERT_STATE = {
  type: "CONFIGURE_VERIFIER_CERT"
  verifierCertificateConfig?: {
    verifierCertificateType?: VerifierCertificateTypeState
    verifierCertificateMnemonic?: string
    verifierCertificateMnemonicId?: string
    mnemonicConfirmed?: boolean
  }
  submitting?: true
  accountConfig: AccountConfigState
}

type AddQrState =
  | { type: "SCAN"; enable: boolean; cameraError?: string; scanError?: string }
  | CONFIGURE_STATE
  | CONFIGURE_VERIFIER_CERT_STATE

type Action =
  | { method: "enableScan" }
  | { method: "setScanError"; error: string }
  | { method: "setCameraError"; error: string }
  | {
      method: "onScan"
      scanned?: { content: string; genesisHash: HexString | null; isAddress: boolean }
    }
  | { method: "setName"; name: string }
  | { method: "setLockToNetwork"; lockToNetwork: boolean }
  | { method: "setSubmitting" }
  | { method: "setSubmittingFailed" }
  | { method: "setConfigureVerifierCert" }
  | {
      method: "setVerifierCertType"
      verifierCertificateType: VerifierCertificateTypeState
      verifierCertificateMnemonicId?: string | undefined
      verifierCertificateMnemonic?: string | undefined
      mnemonicConfirmed?: boolean
    }

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

      const SUBSTRATE_ADDRESS_BYTE_LENGTH = 32
      const ETHEREUM_ADDRESS_BYTE_LENGTH = 20
      const isSubstrateAddress =
        decodeAnyAddress(address).byteLength === SUBSTRATE_ADDRESS_BYTE_LENGTH
      const isEthereumAddress =
        decodeAnyAddress(address).byteLength === ETHEREUM_ADDRESS_BYTE_LENGTH

      if (!isSubstrateAddress && !isEthereumAddress)
        return { type: "SCAN", enable: true, scanError: "QR code contains an invalid address" }
      if (isSubstrateAddress && (!genesisHash || !genesisHash.startsWith("0x")))
        return { type: "SCAN", enable: true, scanError: "QR code contains an invalid genesisHash" }

      return {
        type: "CONFIGURE",
        accountConfig: { name: "", address, genesisHash, lockToNetwork: Boolean(genesisHash) },
      }
    }
  }

  if (state.type === "CONFIGURE") {
    if (action.method === "setName")
      return {
        ...state,
        accountConfig: { ...state.accountConfig, name: action.name },
      }
    if (action.method === "setLockToNetwork")
      return {
        ...state,
        accountConfig: { ...state.accountConfig, lockToNetwork: action.lockToNetwork },
      }
    if (action.method === "setSubmitting") return { ...state, submitting: true }
    if (action.method === "setSubmittingFailed") return { ...state, submitting: undefined }
    if (action.method === "setConfigureVerifierCert")
      return {
        type: "CONFIGURE_VERIFIER_CERT",
        submitting: undefined,
        accountConfig: state.accountConfig,
      }
  }

  if (state.type === "CONFIGURE_VERIFIER_CERT") {
    if (action.method === "setSubmitting") return { ...state, submitting: true }
    if (action.method === "setSubmittingFailed") return { ...state, submitting: undefined }
    if (action.method === "setVerifierCertType") {
      return {
        ...state,
        verifierCertificateConfig: {
          ...state.verifierCertificateConfig,
          verifierCertificateType: action.verifierCertificateType,
          verifierCertificateMnemonicId: action.verifierCertificateMnemonicId,
          verifierCertificateMnemonic: action.verifierCertificateMnemonic,
          mnemonicConfirmed: action.mnemonicConfirmed,
        },
      }
    }
  }

  return state
}

const initialState: AddQrState = { type: "SCAN", enable: false }

const useAccountAddQrContext = ({ onSuccess }: AccountAddPageProps) => {
  const { t } = useTranslation("admin")
  const [state, dispatch] = useReducer(reducer, initialState)
  const hasVerifierCertMnemonic = useHasVerifierCertificateMnemonic()

  const vaultAccounts = useQrCodeAccounts()

  const submit = useCallback(
    async (mnemonic?: string) => {
      if (state.type !== "CONFIGURE" && state.type !== "CONFIGURE_VERIFIER_CERT") return
      if (state.submitting) return

      dispatch({ method: "setSubmitting" })

      const notificationId = notify(
        {
          type: "processing",
          title: t("Importing account"),
          subtitle: "Please wait",
        },
        { autoClose: false }
      )

      // pause to prevent double notification
      await sleep(1000)

      const { name, address, genesisHash, lockToNetwork } = state.accountConfig
      if (state.type === "CONFIGURE_VERIFIER_CERT" && state.verifierCertificateConfig) {
        const {
          verifierCertificateType,
          verifierCertificateMnemonic,
          verifierCertificateMnemonicId,
          mnemonicConfirmed,
        } = state.verifierCertificateConfig
        if (verifierCertificateType) {
          if (verifierCertificateType === "import" && mnemonic) {
            await api.setVerifierCertMnemonic(verifierCertificateType, {
              mnemonic,
              confirmed: true,
            })
          } else if (verifierCertificateType === "new" && verifierCertificateMnemonic) {
            await api.setVerifierCertMnemonic(verifierCertificateType, {
              mnemonic: verifierCertificateMnemonic,
              confirmed: mnemonicConfirmed ?? false,
            })
          } else if (verifierCertificateType === "existing" && verifierCertificateMnemonicId) {
            await api.setVerifierCertMnemonic(verifierCertificateType, {
              mnemonicId: verifierCertificateMnemonicId,
            })
          }
        }
      }

      try {
        const createdAddress = await api.accountCreateQr(
          name || t("My Polkadot Vault Account"),
          address,
          lockToNetwork ? genesisHash : null
        )

        api.assetDiscoveryStartScan(AssetDiscoveryMode.ACTIVE_NETWORKS, [createdAddress])

        onSuccess(createdAddress)
        notifyUpdate(notificationId, {
          type: "success",
          title: t("Account imported"),
          subtitle: name,
        })
      } catch (error) {
        dispatch({ method: "setSubmittingFailed" })
        notifyUpdate(notificationId, {
          type: "error",
          title: t("Error importing account"),
          subtitle: (error as Error)?.message,
        })
      }
    },
    [onSuccess, state, t]
  )

  const submitConfigure = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (state.type !== "CONFIGURE") return
      // save the configuration state to the context to be used in submit
      // if there are already vault accounts or a verifierCertificateMnemonic, they can just submit straight away
      if (vaultAccounts.length > 0 || hasVerifierCertMnemonic) return submit()
      // otherwise, dispatch to setConfigureVerifierCert
      dispatch({ method: "setConfigureVerifierCert" })
    },
    [submit, state, hasVerifierCertMnemonic, vaultAccounts]
  )

  return { state, dispatch, submitConfigure, submit }
}

export const [AccountAddQrProvider, useAccountAddQr] = provideContext(useAccountAddQrContext)
