import { ASSET_DISCOVERY_API_URL } from "extension-shared"

export const fetchEvmNftRefresh = async (id: string) => {
  const req = await fetch(`${ASSET_DISCOVERY_API_URL}/nfts/refresh`, {
    method: "POST",
    body: JSON.stringify({ id }),
  })

  if (!req.ok) throw new Error("Failed to refresh metadata")
}
