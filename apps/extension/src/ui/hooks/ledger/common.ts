import { DEBUG } from "@core/constants"

export type LedgerStatus = "ready" | "warning" | "error" | "connecting" | "unknown"

export type LedgerErrorProps = {
  status: LedgerStatus
  message: string
  requiresManualRetry: boolean
}

const capitalize = (str: string) => (str.length > 1 ? str[0].toUpperCase() + str.slice(1) : str)

export const getLedgerErrorProps = (err: Error, appName: string): LedgerErrorProps => {
  const error = err as Error & { name?: string; statusCode?: number }

  // Generic errors
  switch (err.name) {
    case "SecurityError":
      // happens on some browser when ledger is plugged after browser is launched
      // when this happens, the only way to connect is to restart all instances of the browser
      return {
        status: "error",
        requiresManualRetry: false,
        message: "Failed to connect USB. Restart your browser and retry.",
      }

    case "TransportInterfaceNotAvailable":
      // temporary error just after unlocking, simulate that we're still loading
      return {
        status: "connecting",
        message: `Connecting to Ledger...`,
        requiresManualRetry: false,
      }

    case "TransportStatusError": {
      switch (error.statusCode) {
        case 27404: // locked
        case 27010:
          return {
            status: "warning",
            message: "Please unlock your Ledger.",
            requiresManualRetry: false,
          }
        case 28160: // non-compatible app
        case 25831: // home screen
        case 27906:
        case 57346:
          return {
            status: "warning",
            message: `Please open <strong>${capitalize(appName)}</strong> app on your Ledger.`,
            requiresManualRetry: false,
          }

        default:
          // eslint-disable-next-line no-console
          DEBUG && console.warn("Unknown error code", { error })
      }
      break
    }

    case "TransportOpenUserCancelled":
    case "InvalidStateError":
    case "NetworkError":
    case "NotFoundError":
    case "TransportWebUSBGestureRequired":
      return {
        status: "error",
        message: "Failed to connect to your Ledger. Click here to retry.",
        requiresManualRetry: true,
      }
  }

  // Polkadot specific errors, wrapped in simple Error object
  // only message is available
  switch (err.message) {
    case "App does not seem to be open": // locked but underlying app is eth
    case "Unknown Status Code: 28161": // just unlocked, didn't open kusama yet
      return {
        status: "warning",
        message: `Please open <strong>${capitalize(appName)}</strong> app on your Ledger.`,
        requiresManualRetry: false,
      }
    case "Unknown Status Code: 26628":
    case "Transaction rejected": // unplugged then retry while on lock screen
      return {
        status: "warning",
        message: "Please unlock your Ledger.",
        requiresManualRetry: false,
      }
  }

  // Unknown error, display the error message so user can contact support
  return {
    status: "error",
    message: err.message,
    requiresManualRetry: false,
  }
}
