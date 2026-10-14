import { IPFS_GATEWAY } from "./constants"

const IPFS_SCHEME = /^ipfs:\/\/(?:ipfs\/)?(.+)$/i
const IPFS_GATEWAY_PATH = /^https?:\/\/[^/]+\/ipfs\/(.+)$/i
const BARE_CID = /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z2-7]{20,})(?:\/.*)?$/

export const toIpfsGatewayUrl = (raw: string): string | null => {
  const uri = raw.trim()
  const ipfsPath =
    IPFS_SCHEME.exec(uri)?.[1] ?? IPFS_GATEWAY_PATH.exec(uri)?.[1] ?? BARE_CID.exec(uri)?.[0]
  return ipfsPath ? IPFS_GATEWAY + ipfsPath : null
}
