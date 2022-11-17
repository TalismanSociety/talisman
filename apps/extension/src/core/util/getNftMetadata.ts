const IPFS_GATEWAY = "https://talisman.mypinata.cloud/ipfs/"

const getDownloadUrl = (url: string) => (url ? url.replace(/^ipfs:\/\//, IPFS_GATEWAY) : url)

const getImageUrl = (url: string, width?: number, height?: number) => {
  try {
    // some images hardcode a gateway, replace it with ours
    const saferUrl = getDownloadUrl(url).replace(/^https?:\/\/[^/]+\/ipfs\//, IPFS_GATEWAY)

    // https://docs.pinata.cloud/gateways/image-optimization
    const imgUrl = new URL(saferUrl)

    if (saferUrl.includes(IPFS_GATEWAY)) {
      if (width) imgUrl.searchParams.set("img-width", width.toString())
      if (height) imgUrl.searchParams.set("img-height", height.toString())
      if (width && height) imgUrl.searchParams.set("img-fit", "cover")
    }

    return imgUrl.toString()
  } catch (err) {
    return url
  }
}

export const getNftMetadata = async (
  metadataUri?: string,
  thumbWidth?: number,
  thumbHeight?: number
) => {
  if (!metadataUri) return null

  try {
    const fetchMetadata = await fetch(getDownloadUrl(metadataUri))
    const { name, description, image } = await fetchMetadata.json()
    return {
      name,
      description,
      image: getImageUrl(image, thumbWidth, thumbHeight),
    }
  } catch (err) {
    // failed, ignore
    return null
  }
}
