import { IPFS_GATEWAY } from "@extension/shared"

export const getSafeDownloadUrl = (url: string) =>
  url ? url.replace(/^ipfs:\/\//, IPFS_GATEWAY) : url
