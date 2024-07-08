import { supportedApps } from "@zondax/ledger-substrate"
import { SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"
import { Chain, ChainId } from "extension-core"
import { useMemo } from "react"

import { useAllChainsMap } from "../useChains"

// maps ledger migration apps to our chain id
const LEDGER_MIRATION_APPS: Record<string, ChainId> = {
  Kusama: "kusama",
  Astar: "astar",
  Acala: "acala",
  Karura: "karura",
  Nodle: "nodle-polkadot",
  AlephZero: "aleph-zero",
  Pendulum: "pendulum",
  Polymesh: "polymesh",
  Dock: "dock-pos-mainnet",
  Centrifuge: "centrifuge-polkadot",
  Edgeware: "edgeware",
  Equilibrium: "equilibrium-polkadot",
  Sora: "sora-kusama",
  Genshiro: "genshiro-kusama",
  Polkadex: "polkadex-polkadot",
  VTB: "vtb",
  Bifrost: "bifrost-polkadot",
  XXNetwork: "xxnetwork",
  Interlay: "interlay",
  Parallel: "parallel",
  Picasso: "picasso",
  Polkadot: "polkadot",
  Composable: "composable",
  HydraDX: "hydradx",
  Stafi: "stafi",
  Unique: "unique",
  BifrostKusama: "bifrost-kusama",
  Phala: "phala",
  Khala: "khala",
  Darwinia: "darwinia",
  Ajuna: "ajuna",
  Bittensor: "bittensor",
  Zeitgeist: "zeitgeist",
  Joystream: "joystream",
  Enjin: "enjin-relay",
  Matrixchain: "enjin-matrixchain",
  Quartz: "quartz",
  Avail: "avail",
  Statemine: "kusama-asset-hub",
}

export type SubstrateMigrationApp = SubstrateAppParams & {
  chain?: Chain | null
} & Record<string, unknown> // unused but fixes the dropdown ts error

export const useLedgerSubstrateMigrationApps = () => {
  const chainsMap = useAllChainsMap()

  return useMemo(() => {
    const polkadot = supportedApps.find((app) => app.name === "Polkadot")

    return (
      supportedApps
        // exclude the apps that use same DP & app ID as Polkadot, they don't need migration
        .filter((app) => app.slip0044 !== polkadot?.slip0044 && app.cla !== polkadot?.cla)
        .map<SubstrateMigrationApp>((app) => {
          const chain = chainsMap[LEDGER_MIRATION_APPS[app.name]] ?? null
          return {
            ...app,
            chain,
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    )
  }, [chainsMap])
}

export const useLedgerSubstrateMigrationApp = (name: string | null | undefined) => {
  const apps = useLedgerSubstrateMigrationApps()

  return useMemo(() => (name && apps.find((app) => app.name === name)) || null, [apps, name])
}
