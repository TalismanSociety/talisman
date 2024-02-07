import { execSync } from "child_process"
import fs from "fs"
import path from "path"

import { fetchChains, fetchEvmNetworks, fetchMiniMetadatas, fetchTokens } from "../src/net"

async function generateInitData() {
  fs.writeFileSync(
    path.resolve(__dirname, "../src/init/chains.ts"),
    `export const chains = ${JSON.stringify(await fetchChains(), null, 2)}`
  )
  fs.writeFileSync(
    path.resolve(__dirname, "../src/init/evm-networks.ts"),
    `export const evmNetworks = ${JSON.stringify(await fetchEvmNetworks(), null, 2)}`
  )
  fs.writeFileSync(
    path.resolve(__dirname, "../src/init/tokens.ts"),
    `export const tokens = ${JSON.stringify(await fetchTokens(), null, 2)}`
  )
  fs.writeFileSync(
    path.resolve(__dirname, "../src/init/mini-metadatas.ts"),
    `export const miniMetadatas = ${JSON.stringify(await fetchMiniMetadatas(), null, 2)}`
  )

  execSync(`prettier --write '${path.resolve(__dirname, "../src/init")}'`, { stdio: "inherit" })
}

// Use this command to run this file:
//
// ```
// yarn workspace @talismn/chaindata-provider generate-init-data
// ```
generateInitData()
