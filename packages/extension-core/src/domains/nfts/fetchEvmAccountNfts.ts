import { AccountNfts } from "./types"

export const fetchEvmAccountNfts = async (address: string) => {
  const req = await fetch(`http://localhost:8787/nfts/${address}`)

  if (!req.ok) throw new Error("Failed to fetch nfts")

  return (await req.json()) as AccountNfts
}
