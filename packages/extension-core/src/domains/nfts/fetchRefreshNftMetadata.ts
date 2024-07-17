import { NFTS_API_KEY } from "extension-shared"

import { RefreshNftMetadataRequestBody } from "./types"

export const fetchRefreshNftMetadata = async (
  evmNetworkId: string,
  contractAddress: string,
  tokenId: string
) => {
  const body: RefreshNftMetadataRequestBody = { evmNetworkId, contractAddress, tokenId }

  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (NFTS_API_KEY) headers["X-API-KEY"] = NFTS_API_KEY

  const nftsApiUrl = "https://nfts-api.talisman.xyz/refresh_metadata"
  // const nftsApiUrl = "http://localhost:44009/refresh_metadata"

  const req = await fetch(nftsApiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  if (!req.ok) throw new Error("Failed to fetch nfts")
}
