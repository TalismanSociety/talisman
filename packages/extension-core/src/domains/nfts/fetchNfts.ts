import { FetchNftsRequestBody, FetchNftsResponse } from "./types"

export const fetchNfts = async (addresses: string[]) => {
  const body: FetchNftsRequestBody = { addresses }

  const req = await fetch("http://localhost:8787", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!req.ok) throw new Error("Failed to fetch nfts")

  return (await req.json()) as FetchNftsResponse
}
