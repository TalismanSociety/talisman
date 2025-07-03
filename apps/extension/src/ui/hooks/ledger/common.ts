import { DotNetworkId } from "@talismn/chaindata-provider"
import { supportedApps } from "@zondax/ledger-substrate"
import { SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"

export const CHAIN_ID_TO_LEDGER_APP_NAME: Partial<Record<DotNetworkId, string>> = {
  "kusama": "Kusama",
  "astar": "Astar",
  "acala": "Acala",
  "karura": "Karura",
  "nodle-polkadot": "Nodle",
  "aleph-zero": "AlephZero",
  "pendulum": "Pendulum",
  "polymesh": "Polymesh",
  "dock-pos-mainnet": "Dock",
  "centrifuge-polkadot": "Centrifuge",
  "edgeware": "Edgeware",
  "equilibrium-polkadot": "Equilibrium",
  "sora-kusama": "Sora",
  "genshiro-kusama": "Genshiro",
  "polkadex-polkadot": "Polkadex",
  "vtb": "VTB",
  "bifrost-polkadot": "Bifrost",
  "xxnetwork": "XXNetwork",
  "interlay": "Interlay",
  "parallel": "Parallel",
  "picasso": "Picasso",
  "composable": "Composable",
  "hydradx": "HydraDX",
  "stafi": "Stafi",
  "unique": "Unique",
  "bifrost-kusama": "BifrostKusama",
  "phala": "Phala",
  "khala": "Khala",
  "darwinia": "Darwinia",
  "ajuna": "Ajuna",
  "bittensor": "Bittensor",
  "zeitgeist": "Zeitgeist",
  "joystream": "Joystream",
  "enjin-relay": "Enjin",
  "enjin-matrixchain": "Matrixchain",
  "quartz": "Quartz",
  "avail": "Avail",
  "kusama-asset-hub": "Statemine",
}

export const LEDGER_SUCCESS_CODE = 0x9000

export const LEDGER_HARDENED_OFFSET = 0x80000000

export type LedgerStatus = "ready" | "warning" | "error" | "connecting" | "unknown"

export const getPolkadotLedgerDerivationPath = ({
  accountIndex = 0,
  addressOffset = 0,
  legacyApp,
}: {
  accountIndex?: number
  addressOffset?: number
  legacyApp?: SubstrateAppParams | null
}) => {
  if (!legacyApp) legacyApp = supportedApps.find((a) => a.name === "Polkadot")!

  const slip = legacyApp.slip0044 - LEDGER_HARDENED_OFFSET

  //354 for polkadot
  return `m/44'/${slip}'/${accountIndex}'/0'/${addressOffset}'`
}
