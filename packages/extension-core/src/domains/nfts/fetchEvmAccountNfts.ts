// import { AccountNfts, FetchNftsRequest, FetchNftsResponse } from "./types"

import { AccountNfts } from "./types"

// export const fetchNfts = async (addresses: string[]) => {
//   const body: FetchNftsRequest = { addresses }

//   const req = await fetch("http://localhost:8787/nfts", {
//     method: "POST",
//     body: JSON.stringify(body),
//   })

//   if (!req.ok) throw new Error("Failed to fetch nfts")

//   return (await req.json()) as FetchNftsResponse
// }

export const fetchEvmAccountNfts = async (address: string) => {
  const req = await fetch(`http://localhost:8787/nfts/${address}`)

  if (!req.ok) throw new Error("Failed to fetch nfts")

  return (await req.json()) as AccountNfts
}
