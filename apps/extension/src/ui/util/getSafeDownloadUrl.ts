import { toIpfsGatewayUrl } from "@common/ipfs"

export const getSafeDownloadUrl = (url: string) => toIpfsGatewayUrl(url) ?? url
