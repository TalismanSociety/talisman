// Chainflip values shared between the swap module and the background status watcher.
//
// Quotes and deposit channels are requested from ui/domains/Swap/, while swap status is polled
// from core/domains/transactions/, and no file under core/ may import @ui/ — so the few things
// both layers need live here rather than being written twice.
//
// The key is a plaintext client-side credential, matching the posture of lifiApiKey and
// simpleswapApiKey in remoteConfig.default.json. It identifies the partner for attribution and
// rate limiting; it moves no funds. Moving it to the `swaps` section of the remote config would
// allow rotation without a release, and would remove the need to import it here at all — that
// needs `chainflipApiKey` added to the schema on wrc.talisman.xyz first, because
// RemoteConfigApi.ts is generated from its openapi.json.

const CHAINFLIP_API_KEY = "d33dfef2677849b294ec4cfb8de4d28e"

// Partner commission, in basis points (60 = 0.6%, Talisman's requested rate), sent on every
// quote and deposit channel.
//
// This must be sent explicitly. The billed rate is max(configured, sent) + 5 bps, where
// "configured" is the dashboard setting on the credential — and this credential is configured
// at 0, so omitting it here would earn nothing.
export const CHAINFLIP_COMMISSION_BPS = 60

export type ChainflipChannel = {
  issuedBlock: number
  /** Network display name, e.g. "Ethereum" — echoed back verbatim when polling status. */
  network: string
  channelId: number
}

/**
 * A deposit channel's identifier: "{issuedBlock}-{network}-{channelId}".
 *
 * Chainflip's own swap id is nullable until the swap row is saved, so the channel is what
 * status polling and the explorer both key on. This is the same string the explorer uses in
 * its urls, and the same one the /swap response returns as explorerUrl.
 */
export const chainflipChannelId = ({ issuedBlock, network, channelId }: ChainflipChannel) =>
  `${issuedBlock}-${network}-${channelId}`

export const parseChainflipChannelId = (id: string): ChainflipChannel | null => {
  const parts = id.split("-")
  if (parts.length < 3) return null

  const issuedBlock = Number(parts[0])
  const channelId = Number(parts[parts.length - 1])
  // Rejoined rather than indexed, so a network whose display name contains a hyphen survives
  const network = parts.slice(1, -1).join("-")
  if (!Number.isInteger(issuedBlock) || !Number.isInteger(channelId) || !network) return null

  return { issuedBlock, network, channelId }
}

/** The block explorer link for a deposit channel, from the channel id alone. */
export const chainflipChannelUrl = (channelId: string) =>
  `https://scan.chainflip.io/channels/${channelId}`

/** Throws rather than falling back to an un-keyed call, which would earn no commission. */
export const getChainflipApiKey = () => {
  if (!CHAINFLIP_API_KEY) throw new Error("Chainflip api key not found")
  return CHAINFLIP_API_KEY
}
