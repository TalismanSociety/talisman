import { getSafeDownloadUrl } from "./getSafeDownloadUrl"
import { getSafeImageUrl } from "./getSafeImageUrl"

export const getNftMetadata = async (
  metadataUri?: string,
  thumbWidth?: number,
  thumbHeight?: number
) => {
  if (!metadataUri) return null

  try {
    const fetchMetadata = await fetch(getSafeDownloadUrl(metadataUri))
    const { name, description, image } = await fetchMetadata.json()
    return {
      name,
      description,
      image: getSafeImageUrl(image, thumbWidth, thumbHeight),
    }
  } catch (err) {
    // failed, ignore
    return null
  }
}
