import { toIpfsGatewayUrl } from "@common/ipfs"

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

export const normaliseMetadataUri = (raw: string): string | null =>
  toIpfsGatewayUrl(raw) ?? (isPublicHttpsUrl(raw.trim()) ? raw.trim() : null)
