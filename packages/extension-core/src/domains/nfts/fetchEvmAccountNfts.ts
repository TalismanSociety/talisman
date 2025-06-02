import { ASSET_DISCOVERY_API_URL } from "extension-shared"

import { AccountNfts } from "./types"

export const fetchEvmAccountNfts = async (address: string) => {
  const req = await fetch(`${ASSET_DISCOVERY_API_URL}/nfts/${address}`)

  if (!req.ok) throw new Error("Failed to fetch nfts")

  return (await req.json()) as AccountNfts
}
