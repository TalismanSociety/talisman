import { DEBUG } from "@core/constants"

// this should live in chaindata in the future
export const ledgerNetworks = [
  {
    // name should be one of the keys of the knownLedger object :
    // https://github.com/polkadot-js/common/blob/master/packages/networks/src/defaults/ledger.ts
    name: "polkadot",
    genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
  },
  {
    name: "kusama",
    genesisHash: "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe",
  },
  {
    name: "acala",
    genesisHash: "0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c",
  },
  {
    name: "nodle-para",
    genesisHash: "0x97da7ede98d7bad4e36b4d734b6055425a3be036da2a332ea5a7037656427a21",
  },
  {
    name: "statemine",
    genesisHash: "0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a",
  },
  {
    name: "statemint",
    genesisHash: "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f",
  },
  {
    name: "centrifuge",
    genesisHash: "0xb3db41421702df9a7fcac62b53ffeac85f7853cc4e689e0b93aeb3db18c09d82",
  },
]

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

    case "NetworkError": // while connecting
    case "InvalidStateError": // while connecting
    case "TransportInterfaceNotAvailable": // after unlock
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
