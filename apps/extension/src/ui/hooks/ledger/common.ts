import { DEBUG } from "@core/constants"
import { TFunction } from "i18next"

// this should live in chaindata in the future
export const ledgerNetworks = [
  {
    // name should be one of the keys of the knownLedger object :
    // https://github.com/polkadot-js/common/blob/master/packages/networks/src/defaults/ledger.ts
    name: "polkadot",
    genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
    label: "Polkadot", // used both in "Please open Polkadot app" message and for naming accounts e.g. "Ledger Polkadot 1"
  },
  {
    name: "kusama",
    genesisHash: "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe",
    label: "Kusama",
  },
  {
    name: "astar",
    genesisHash: "0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6",
    label: "Astar",
  },
  {
    name: "acala",
    genesisHash: "0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c",
    label: "Acala",
  },
  {
    name: "karura",
    genesisHash: "0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b",
    label: "Karura",
  },
  {
    name: "nodle-para",
    genesisHash: "0x97da7ede98d7bad4e36b4d734b6055425a3be036da2a332ea5a7037656427a21",
    label: "Nodle",
  },
  // commented because statemine accounts override kusama accounts when imported
  // {
  //   name: "statemine",
  //   genesisHash: "0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a",
  // },
  // commented because statemine accounts override polkadot accounts when imported
  // {
  //   name: "statemint",
  //   genesisHash: "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f",
  // },
  {
    name: "centrifuge",
    genesisHash: "0xb3db41421702df9a7fcac62b53ffeac85f7853cc4e689e0b93aeb3db18c09d82",
    label: "Centrifuge",
  },
]

export type LedgerStatus = "ready" | "warning" | "error" | "connecting" | "unknown"

export type LedgerErrorProps = {
  status: LedgerStatus
  message: string
  requiresManualRetry: boolean
}

const capitalize = (str: string) => (str.length > 1 ? str[0].toUpperCase() + str.slice(1) : str)

export const getLedgerErrorProps = (
  err: Error,
  appName: string,
  t: TFunction
): LedgerErrorProps => {
  const error = err as Error & { name?: string; statusCode?: number }

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

    case "TransportStatusError": {
      switch (error.statusCode) {
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

    case t("This transaction cannot be signed via an Ethereum Ledger account."):
    case t("There is no Ledger app available for this network."):
      return {
        status: "error",
        message: err.message,
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
