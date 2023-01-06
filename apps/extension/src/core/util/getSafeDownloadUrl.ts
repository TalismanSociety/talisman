import { IPFS_GATEWAY } from "@core/constants"

export const getSafeDownloadUrl = (url: string) =>
  url ? url.replace(/^ipfs:\/\//, IPFS_GATEWAY) : url
