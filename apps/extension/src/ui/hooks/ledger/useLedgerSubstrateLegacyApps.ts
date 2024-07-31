// import { useMemo } from "react"
// import { useTranslation } from "react-i18next"

import { supportedApps } from "@zondax/ledger-substrate"
import { SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"
import { Chain, ChainId } from "extension-core"
import { keyBy } from "lodash"
import { useMemo } from "react"

import { useAllChains } from "../useChains"

// import { ledgerNetworks } from "./common"

// export const useLedgerSubstrateLegacyApp = (genesisHash?: string | null) => {
//   const { t } = useTranslation()
//   return useMemo(
//     () =>
//       genesisHash
//         ? ledgerNetworks.find((n) => n.genesisHash === genesisHash) ?? {
//             name: "",
//             genesisHash: "",
//             label: t("Unknown app"),
//           }
//         : null,
//     [genesisHash, t]
//   )
// }

type LedgerSubstrateLegacyApp = SubstrateAppParams & {
  chain?: Chain | null
} & Record<string, unknown>

const LEDGER_LEGACY_APPS: Record<string, ChainId> = {
  Polkadot: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
  Kusama: "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe",
  Astar: "0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6",
  Acala: "0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c",
  Karura: "0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b",
  Nodle: "0x97da7ede98d7bad4e36b4d734b6055425a3be036da2a332ea5a7037656427a21",
  Statemine: "0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a",
  Statemint: "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f",
  AlephZero: "0x70255b4d28de0fc4e1a193d7e175ad1ccef431598211c55538f1018651a0344e",
  Pendulum: "0x5d3c298622d5634ed019bf61ea4b71655030015bde9beb0d6a24743714462c86",
  XXNetwork: "0x50dd5d206917bf10502c68fb4d18a59fc8aa31586f4e8856b493e43544aa82aa",
  Avail: "0xb91746b45e0346cc2f815a520b9c6cb4d5c0902af848db0a80f85932d2e8276a",
}

export const useLedgerSubstrateLegacyApps = () => {
  const chains = useAllChains()
  const chainsByGenesisHash = useMemo(() => keyBy(chains, "genesisHash"), [chains])

  return useMemo(() => {
    return supportedApps
      .map<LedgerSubstrateLegacyApp>((app) => {
        const chain = chainsByGenesisHash[LEDGER_LEGACY_APPS[app.name]] ?? null
        return { ...app, chain }
      })
      .filter((app) => !!app.chain && !app.chain?.hasCheckMetadataHash)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [chainsByGenesisHash])
}

export const useLedgerSubstrateLegacyApp = (genesisHash: string | null | undefined) => {
  const apps = useLedgerSubstrateLegacyApps()

  return useMemo(
    () => (genesisHash && apps.find((app) => app.chain?.genesisHash === genesisHash)) || null,
    [apps, genesisHash]
  )
}

export const useLedgerSubstrateLegacyChains = () => {
  const legacyApps = useLedgerSubstrateLegacyApps()

  return useMemo(
    () =>
      legacyApps
        .map((app) => app.chain)
        .filter((c): c is Chain => !!c)
        .sort(
          (c1, c2) =>
            (c1.sortIndex ?? Number.MAX_SAFE_INTEGER) - (c2.sortIndex ?? Number.MAX_SAFE_INTEGER)
        ),
    [legacyApps]
  )
}
