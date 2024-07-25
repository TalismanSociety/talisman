import { EvmNetworkId } from "@talismn/chaindata-provider"
import { NFTS_API_BASE_PATH, NFTS_API_KEY } from "extension-shared"

import { FetchNftsRequestBody, FetchNftsResponse } from "./types"

export const fetchNfts = async (addresses: string[], evmNetworkIds: EvmNetworkId[]) => {
  const body: FetchNftsRequestBody = { addresses, evmNetworkIds }

  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (NFTS_API_KEY) headers["X-API-KEY"] = NFTS_API_KEY

  const req = await fetch(NFTS_API_BASE_PATH, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  if (!req.ok) throw new Error("Failed to fetch nfts")

  return (await req.json()) as FetchNftsResponse
}
