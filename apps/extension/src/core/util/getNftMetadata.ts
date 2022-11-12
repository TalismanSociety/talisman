const getSafeDownloadUrl = (url: string) =>
  url ? url.replace(/^ipfs:\/\//, "https://cf-ipfs.com/ipfs/") : url

export const getNftMetadata = async (metadataUri?: string) => {
  if (!metadataUri) return null

  try {
    const fetchMetadata = await fetch(getSafeDownloadUrl(metadataUri))
    const { name, description, image } = await fetchMetadata.json()
    return {
      name,
      description,
      image: getSafeDownloadUrl(image),
    }
  } catch (err) {
    // failed, ignore
    return null
  }
}
