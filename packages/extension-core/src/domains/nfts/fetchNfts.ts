import { NFTS_API_KEY } from "extension-shared"

import { FetchNftsRequestBody, FetchNftsResponse } from "./types"

export const fetchNfts = async (addresses: string[]) => {
  const body: FetchNftsRequestBody = { addresses }

  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (NFTS_API_KEY) headers["X-API-KEY"] = NFTS_API_KEY

  const nftsApiUrl = "https://nfts-api.talisman.xyz"
  //const nftsApiUrl = "http://localhost:8787"

  const req = await fetch(nftsApiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  if (!req.ok) throw new Error("Failed to fetch nfts")

  return (await req.json()) as FetchNftsResponse
}
