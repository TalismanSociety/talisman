import ledgerNetworks from "@core/util/ledgerNetworks"
import useChains from "@ui/hooks/useChains"
import { useMemo } from "react"

// this should live in chaindata in the future
const networksWithLedgerApp = [
  {
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
    name: "nodle",
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

export const useLedgerChains = () => {
  const chains = useChains()

  const ledgerChains = useMemo(
    () =>
      (chains || [])
        .filter((c) =>
          ledgerNetworks.some((lc) => lc.genesisHash.includes(c.genesisHash as string))
        )
        .filter((c) => networksWithLedgerApp.some((lc) => lc.genesisHash === c.genesisHash))
        .sort(
          (c1, c2) =>
            (c1.sortIndex ?? Number.MAX_SAFE_INTEGER) - (c2.sortIndex ?? Number.MAX_SAFE_INTEGER)
        ),
    [chains]
  )

  return ledgerChains
}
