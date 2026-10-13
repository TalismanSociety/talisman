import { IPFS_GATEWAY } from "@common/constants"

const IPFS_SCHEME = /^ipfs:\/\/(?:ipfs\/)?(.+)$/i
const IPFS_GATEWAY_PATH = /^https?:\/\/[^/]+\/ipfs\/(.+)$/i
const BARE_CID = /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z2-7]{20,})(?:\/.*)?$/
const HTTPS_URL = /^https:\/\/\S+$/i
const IPV4 = /^\d+(?:\.\d+){3}$/
const LOCAL_NAME = /\.local(?:host)?$/
const TRAILING_DOT = /\.$/

const isPublicHostname = (hostname: string) =>
  hostname.includes(".") &&
  !hostname.startsWith("[") &&
  !IPV4.test(hostname) &&
  !LOCAL_NAME.test(hostname)

const isPublicHttpsUrl = (uri: string) =>
  HTTPS_URL.test(uri) &&
  URL.canParse(uri) &&
  isPublicHostname(new URL(uri).hostname.replace(TRAILING_DOT, ""))

export const normaliseMetadataUri = (raw: string): string | null => {
  const uri = raw.trim()

  const ipfsPath =
    IPFS_SCHEME.exec(uri)?.[1] ?? IPFS_GATEWAY_PATH.exec(uri)?.[1] ?? BARE_CID.exec(uri)?.[0]
  if (ipfsPath) return IPFS_GATEWAY + ipfsPath

  return isPublicHttpsUrl(uri) ? uri : null
}
