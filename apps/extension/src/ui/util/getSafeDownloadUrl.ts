import { IPFS_GATEWAY } from "@common/constants"

export const getSafeDownloadUrl = (url: string) =>
  url
    ? url
        .replace(/^ipfs:\/\/(ipfs\/)?/, IPFS_GATEWAY)
        .replace(/^https?:\/\/[^/]+\/ipfs\//, IPFS_GATEWAY)
    : url
