import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import { fetchChaindata } from "../src/state/net"
import { ChaindataFileSchema } from "../src/state/schema"

const NETWORK_IDS = [
  "polkadot",
  "polkadot-asset-hub",
  "kusama",
  "kusama-asset-hub",
  "bittensor",
  "hydradx",
  "bifrost-polkadot",
  "solana-mainnet",

  "1",
  "8453", // base
  "1284", // moonbeam
  "42161", // arbitrum
  "56", // bsc
  "10", // optimism
  "137", // polygon
]

async function generateInitData() {
  const chaindata = await fetchChaindata()

  const initData = {
    networks: chaindata.networks.filter((n) => NETWORK_IDS.includes(n.id)),
    tokens: chaindata.tokens.filter((t) => NETWORK_IDS.includes(t.networkId) && t.isDefault),
    miniMetadatas: chaindata.miniMetadatas.filter((m) => NETWORK_IDS.includes(m.chainId)),
  }

  const parsed = ChaindataFileSchema.safeParse(initData)
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid chaindata:", parsed.error.issues)
    throw new Error("Invalid chaindata")
  }

  fs.writeFileSync(
    path.resolve(__dirname, "../src/state/initChaindata.json"),
    JSON.stringify(initData, null, 2),
  )

  execSync(`prettier --write '${path.resolve(__dirname, "../src/state/initChaindata.json")}'`, {
    stdio: "inherit",
  })
}

// Use this command to run this file:
//
// ```
// `pnpm chore:generate-init-data`
// ```
generateInitData()
