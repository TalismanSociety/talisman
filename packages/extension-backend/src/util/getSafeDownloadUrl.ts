import { IPFS_GATEWAY } from "../constants"

export const getSafeDownloadUrl = (url: string) =>
  url ? url.replace(/^ipfs:\/\//, IPFS_GATEWAY) : url
