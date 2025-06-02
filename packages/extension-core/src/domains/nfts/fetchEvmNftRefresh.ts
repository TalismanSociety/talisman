export const fetchEvmNftRefresh = async (id: string) => {
  const req = await fetch(`http://localhost:8787/nfts/refresh`, {
    method: "POST",
    body: JSON.stringify({ id }),
  })

  if (!req.ok) throw new Error("Failed to refresh metadata")
}
