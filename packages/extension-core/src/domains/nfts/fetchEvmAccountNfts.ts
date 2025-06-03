import { ASSET_DISCOVERY_API_URL } from "extension-shared"

import { AccountNfts } from "./types"

export const fetchEvmAccountNfts = async (address: string, signal: AbortSignal) => {
  const req = await fetch(`${ASSET_DISCOVERY_API_URL}/nfts/${address}`, { signal })

  if (!req.ok) throw new Error("Failed to fetch nfts")

  return (await req.json()) as AccountNfts
}
