import fs from "fs"
import path from "path"

import { fetchChains, fetchEvmNetworks, fetchTokens } from "../graphql"

async function generateMockData() {
  fs.writeFileSync(
    path.resolve(__dirname, "../../src/__mocks__/_mockData.ts"),
    `
export const mockChainsResponse = ${JSON.stringify(await fetchChains(), null, 2)}


export const mockEvmNetworksResponse = ${JSON.stringify(await fetchEvmNetworks(), null, 2)}


export const mockTokensResponse = ${JSON.stringify(await fetchTokens(), null, 2)}
`
  )
}

// Use these commands to run this file:
//
// ```
// yarn workspace @talismn/chaindata-provider-extension build
// node packages/chaindata-provider-extension/dist/__mocks__/_generateMockData.js
// ```
generateMockData()
