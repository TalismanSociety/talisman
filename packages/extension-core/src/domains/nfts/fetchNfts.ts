import { FetchNftsRequest, FetchNftsResponse } from "./types"

export const fetchNfts = async (addresses: string[]) => {
  const body: FetchNftsRequest = { addresses }

  const req = await fetch("http://localhost:8787/nfts", {
    method: "POST",
    body: JSON.stringify(body),
  })

  if (!req.ok) throw new Error("Failed to fetch nfts")

  return (await req.json()) as FetchNftsResponse
}
