import { DEBUG, log } from "extension-shared"
import { t } from "i18next"
import { capitalize } from "lodash-es"

export const ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE =
  "This transaction cannot be signed via an Ethereum Ledger account."
export const ERROR_LEDGER_NO_APP = "There is no Ledger app available for this network."

type NativeLedgerError = {
  message: string
  name?: string // if error raised by @zondax/*
  statusCode?: number // if error raised by @zondax/*
  returnCode?: number // if error raised by @ledgerhq/hw-transport
  code?: number // if error raised by @ledgerhq/hw-transport-webusb
}

// used to generate an error-like object when using an api (substrate legacy app) that returns error message as part of the response without throwing it
export const getCustomNativeLedgerError = (
  message: string,
  statusCode?: number,
): NativeLedgerError => {
  const error = new Error(message) as NativeLedgerError
  error.name = "Unknown"
  error.statusCode = statusCode
  error.returnCode = statusCode
  return error
}

type TalismanLedgerErrorName =
  | "Custom"
  | "Unknown"
  | "UnsupportedVersion"
  | "InvalidApp"
  | "NotFound"
  | "Timeout"
  | "Locked"
  | "BrowserSecurity"
  | "Busy"
  | "Network"
  | "InvalidRequest"
  | "UserRejected"
  | "GenericAppRequired"
  | "Unauthorized"

export class TalismanLedgerError extends Error {
  constructor(name: TalismanLedgerErrorName, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = name || "Unknown"
  }
}

export const getTalismanLedgerError = (
  error: unknown,
  appName: string = "Unknown App",
): TalismanLedgerError => {
  if (error instanceof TalismanLedgerError) return error

  if (typeof error === "string") return new TalismanLedgerError("Custom", error)

  log.log("getTalismanLedgerError", { error })

  const cause = error as NativeLedgerError

  // Generic errors
  if (cause.name) {
    switch (cause.name) {
      case "SecurityError":
        // happens on some browser when ledger is plugged after browser is launched
        // when this happens, the only way to connect is to restart all instances of the browser
        return new TalismanLedgerError(
          "BrowserSecurity",
          t("Failed to connect USB. Restart your browser and retry."),
          { cause },
        )

      case "NotFoundError":
        return new TalismanLedgerError("NotFound", t("Device not found"), { cause })

      case "NetworkError":
        return new TalismanLedgerError(
          "Network",
          t("Failed to connect to Ledger (network error)"),
          { cause },
        )

      case "InvalidStateError":
        return new TalismanLedgerError(
          "Unknown",
          t("Failed to connect to Ledger (invalid state). Ledger might be busy."),
          { cause },
        )

      case "UnsupportedVersion": // For ethereum only
        return new TalismanLedgerError(
          "UnsupportedVersion",
          t("Please update your Ledger Ethereum app"),
          { cause },
        )

      case "TransportStatusError":
        return getErrorFromCode(cause.statusCode, appName, cause)

      case "TransportOpenUserCancelled": // occurs when user doesn't select a device in the browser popup (also noticed it when device is turned off or sleeping)
        return new TalismanLedgerError("Unauthorized", t("Failed to connect to your Ledger"), {
          cause,
        })

      case "TransportWebUSBGestureRequired":
      case "TransportInterfaceNotAvailable": // occurs after unlock, or if browser requires a click to connect usb (only on MacOS w/chrome)
        return new TalismanLedgerError(
          "BrowserSecurity",
          t("Failed to connect to your Ledger (browser security)"),
          { cause },
        )
    }
  }

  if (cause.returnCode) return getErrorFromCode(cause.returnCode, appName, cause)

  // Polkadot specific errors, wrapped in simple Error object
  // only message is available
  switch (cause.message) {
    case "Timeout": // this one is throw by Talisman in case of timeout when calling ledger.getAddress
      return new TalismanLedgerError("Timeout", t("Failed to connect to your Ledger (timeout)"), {
        cause,
      })

    case "Failed to execute 'requestDevice' on 'USB': Must be handling a user gesture to show a permission request.":
      return new TalismanLedgerError(
        "BrowserSecurity",
        t("Failed to connect to your Ledger (browser security)"),
        { cause },
      )

    case "App does not seem to be open": // locked but underlying app is eth
    case "Unknown Status Code: 28161": // just unlocked, didn't open kusama yet
    case "Unknown Status Code: 38913": // just unlocked, didn't open kusama yet
      return getOpenLedgerAppError(appName, cause)

    case "Unknown Status Code: 26628":
    case "Transaction rejected": // unplugged then retry while on lock screen
      return new TalismanLedgerError("Locked", t("Please unlock your Ledger"), { cause })

    case "Device is busy":
      return new TalismanLedgerError("Busy", t("Failed to connect to Ledger (device is busy)"), {
        cause,
      })

    case "NetworkError: Failed to execute 'transferOut' on 'USBDevice': A transfer error has occurred.":
    case "NetworkError: Failed to execute 'transferIn' on 'USBDevice': A transfer error has occurred.":
      return new TalismanLedgerError("Network", t("Failed to connect to Ledger (network error)"), {
        cause,
      })

    case "Instruction not supported":
      return new TalismanLedgerError(
        "InvalidRequest",
        t(
          "This instruction is not supported on your ledger. You should check for firmware and app updates in Ledger Live before trying again.",
        ),
        { cause },
      )

    case ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE:
      return new TalismanLedgerError(
        "InvalidRequest",
        t("This transaction cannot be signed via an Ethereum Ledger account."),
        { cause },
      )

    case ERROR_LEDGER_NO_APP:
      return new TalismanLedgerError(
        "InvalidRequest",
        t("There is no Ledger app available for this network."),
        { cause },
      )
  }

  // eslint-disable-next-line no-console
  DEBUG && console.warn("unmanaged ledger error", { error })

  // If available, display the actual error message so our help-desk can understand what s going on
  return new TalismanLedgerError("Unknown", cause.message ?? "Failed to connect to your Ledger", {
    cause,
  })
}

export const getOpenLedgerAppError = (appName: string, cause?: unknown) => {
  return new TalismanLedgerError(
    "InvalidApp",
    t(`Please open <strong>{{appName}}</strong> app on your Ledger.`, {
      appName: capitalize(appName),
    }),
    { cause },
  )
}

const getErrorFromCode = (code: number | undefined, appName: string, cause: unknown) => {
  switch (code) {
    case 27014:
      return new TalismanLedgerError(
        "UserRejected",
        t("Transaction was rejected by the Ledger device."),
        { cause },
      )

    case 27404: // locked
    case 27010:
    case 21781:
      return new TalismanLedgerError("Locked", t("Please unlock your Ledger"), { cause })

    case 28160: // non-compatible app
    case 28161: // home screen on Flex
    case 25831: // home screen
    case 25873:
    case 27906:
    case 57346:
    default:
      return new TalismanLedgerError(
        "InvalidApp",
        t(`Please open <strong>{{appName}}</strong> app on your Ledger.`, {
          appName: capitalize(appName),
        }),
        { cause },
      )
  }
}
