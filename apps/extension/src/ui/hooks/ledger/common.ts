import { supportedApps } from "@zondax/ledger-substrate"
import { SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"
import { t } from "i18next"

import { DEBUG } from "@extension/shared"

export const LEDGER_SUCCESS_CODE = 0x9000

export const LEDGER_HARDENED_OFFSET = 0x80000000

export class LedgerError extends Error {
  statusCode?: number

  constructor(message?: string, name?: string, statusCode?: number) {
    super(message)
    this.name = name || "Error"
    this.statusCode = statusCode
  }
}

export const ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE =
  "This transaction cannot be signed via an Ethereum Ledger account."
export const ERROR_LEDGER_NO_APP = "There is no Ledger app available for this network."

export type LedgerStatus = "ready" | "warning" | "error" | "connecting" | "unknown"

export type LedgerErrorProps = {
  status: LedgerStatus
  message: string
  requiresManualRetry: boolean
}

const capitalize = (str: string) => (str.length > 1 ? str[0].toUpperCase() + str.slice(1) : str)

export const getLedgerErrorProps = (err: LedgerError, appName: string): LedgerErrorProps => {
  // Generic errors
  switch (err.name) {
    case "SecurityError":
      // happens on some browser when ledger is plugged after browser is launched
      // when this happens, the only way to connect is to restart all instances of the browser
      return {
        status: "error",
        requiresManualRetry: false,
        message: t("Failed to connect USB. Restart your browser and retry."),
      }

    case "NotFoundError":
    case "NetworkError": // while connecting
    case "InvalidStateError": // while connecting
      return {
        status: "connecting",
        message: t(`Connecting to Ledger...`),
        requiresManualRetry: false,
      }

    case "UnsupportedVersion": // For ethereum only
      return {
        status: "error",
        message: t("Please update your Ledger Ethereum app."),
        requiresManualRetry: false,
      }

    case "TransportStatusError": {
      switch (err.statusCode) {
        case 27404: // locked
        case 27010:
          return {
            status: "warning",
            message: t("Please unlock your Ledger."),
            requiresManualRetry: false,
          }
        case 28160: // non-compatible app
        case 25831: // home screen
        case 25873:
        case 27906:
        case 57346:
        default:
          return {
            status: "warning",
            message: t(`Please open <strong>{{appName}}</strong> app on your Ledger.`, {
              appName: capitalize(appName),
            }),
            requiresManualRetry: false,
          }
      }
    }

    case "TransportOpenUserCancelled": // occurs when user doesn't select a device in the browser popup
    case "TransportWebUSBGestureRequired":
    case "TransportInterfaceNotAvailable": // occurs after unlock, or if browser requires a click to connect usb (only on MacOS w/chrome)
      return {
        status: "error",
        message: t("Failed to connect to your Ledger. Click here to retry."),
        requiresManualRetry: true,
      }
  }

  // Polkadot specific errors, wrapped in simple Error object
  // only message is available
  switch (err.message) {
    case "Timeout": // this one is throw by Talisman in case of timeout when calling ledger.getAddress
    case "Failed to execute 'requestDevice' on 'USB': Must be handling a user gesture to show a permission request.":
      return {
        status: "error",
        message: t("Failed to connect to your Ledger. Click here to retry."),
        requiresManualRetry: true,
      }

    case "App does not seem to be open": // locked but underlying app is eth
    case "Unknown Status Code: 28161": // just unlocked, didn't open kusama yet
    case "Unknown Status Code: 38913": // just unlocked, didn't open kusama yet
      return {
        status: "warning",
        message: t(`Please open <strong>{{appName}}</strong> app on your Ledger.`, { appName }),
        requiresManualRetry: false,
      }
    case "Unknown Status Code: 26628":
    case "Transaction rejected": // unplugged then retry while on lock screen
      return {
        status: "warning",
        message: t("Please unlock your Ledger."),
        requiresManualRetry: false,
      }

    case "Device is busy":
    case "NetworkError: Failed to execute 'transferOut' on 'USBDevice': A transfer error has occurred.":
    case "NetworkError: Failed to execute 'transferIn' on 'USBDevice': A transfer error has occurred.":
      return {
        status: "connecting",
        message: t(`Connecting to Ledger...`),
        requiresManualRetry: false,
      }

    case ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE:
      return {
        status: "error",
        // can't reuse the const here because the i18n plugin wouldn't lookup the content
        message: t("This transaction cannot be signed via an Ethereum Ledger account."),
        requiresManualRetry: false,
      }

    case ERROR_LEDGER_NO_APP:
      return {
        status: "error",
        // can't reuse the const here because we need i18n plugin to parse the text
        message: t("There is no Ledger app available for this network."),
        requiresManualRetry: false,
      }
  }

  // eslint-disable-next-line no-console
  DEBUG && console.warn("unmanaged ledger error", { err })

  // Fallback error message
  return {
    status: "error",
    message: t("Failed to connect to your Ledger. Click here to retry."),
    requiresManualRetry: true,
  }
}

export const getPolkadotLedgerDerivationPath = ({
  accountIndex = 0,
  addressOffset = 0,
  app,
}: {
  accountIndex?: number
  addressOffset?: number
  app?: SubstrateAppParams | null
}) => {
  if (!app) app = supportedApps.find((a) => a.name === "Polkadot")!

  const slip = app.slip0044 - LEDGER_HARDENED_OFFSET

  //354 for polkadot
  return `m/44'/${slip}'/${accountIndex}'/0'/${addressOffset}'`
}
