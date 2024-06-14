import { DEBUG } from "@extension/shared"
import { supportedApps } from "@zondax/ledger-substrate"
import { SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"
import { t } from "i18next"

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
  {
    name: "statemine",
    genesisHash: "0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a",
    label: "Statemine", // current name of the app in Ledger Live and on the device, hasn't been renamed to Kusama Asset Hub yet.
  },
  {
    name: "statemint",
    genesisHash: "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f",
    label: "Statemint", // current name of the app in Ledger Live and on the device, hasn't been renamed to Polkadot Asset Hub yet.
  },
  {
    name: "aleph-node",
    genesisHash: "0x70255b4d28de0fc4e1a193d7e175ad1ccef431598211c55538f1018651a0344e",
    label: "Aleph Zero",
  },
  {
    name: "pendulum",
    genesisHash: "0x5d3c298622d5634ed019bf61ea4b71655030015bde9beb0d6a24743714462c86",
    label: "Pendulum",
  },
  {
    name: "xxnetwork",
    genesisHash: "0x50dd5d206917bf10502c68fb4d18a59fc8aa31586f4e8856b493e43544aa82aa",
    label: "xx network",
  },
]

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

  const HARDENED = 0x80000000
  const slip = app.slip0044 - HARDENED

  //354 for polkadot
  return `m/44'/${slip}'/${accountIndex}'/0'/${addressOffset}'`
}
