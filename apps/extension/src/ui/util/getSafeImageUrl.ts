import { IPFS_GATEWAY } from "@extension/shared"

import { getSafeDownloadUrl } from "./getSafeDownloadUrl"

export const getSafeImageUrl = (url: string, width?: number, height?: number) => {
  try {
    // some images hardcode a gateway, replace it with ours
    const saferUrl = getSafeDownloadUrl(url).replace(/^https?:\/\/[^/]+\/ipfs\//, IPFS_GATEWAY)

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
