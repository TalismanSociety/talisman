import type { ValidRequests } from "@core/libs/requests/types"

import { isHostname } from "./schema"
import type { ChainPlatform } from "./transactions"

/** Solana names follow the wallet-standard features. */
export const DAPP_METHODS = [
  "connect",
  "signIn",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v1",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "eth_sendTransaction",
  "wallet_addEthereumChain",
  "wallet_watchAsset",
  "signPayload",
  "signRaw",
  "signVrf",
  "signMessage",
  "signTransaction",
  "signAndSendTransaction",
] as const
export type DappMethod = (typeof DAPP_METHODS)[number]

export type DappRequestKind = { method: DappMethod; platform: ChainPlatform }

/**
 * From the stored request, never from the `pub(*)` call: `createRequest` never sees the call, and
 * several calls create the same request type (every `auth` request is `connect`).
 */
export const describeDappRequest = (request: ValidRequests): DappRequestKind => {
  switch (request.type) {
    case "auth":
      return { method: "connect", platform: request.request.provider }
    case "auth-sol-signIn":
      return { method: "signIn", platform: "solana" }
    case "eth-sign":
      return { method: request.method, platform: "ethereum" }
    case "eth-send":
      return { method: "eth_sendTransaction", platform: "ethereum" }
    case "eth-network-add":
      return { method: "wallet_addEthereumChain", platform: "ethereum" }
    case "eth-watchasset":
      return { method: "wallet_watchAsset", platform: "ethereum" }
    case "substrate-sign":
      return {
        method: "genesisHash" in request.request.payload ? "signPayload" : "signRaw",
        platform: "polkadot",
      }
    case "vrf-sign":
      return { method: "signVrf", platform: "polkadot" }
    case "sol-sign":
      return {
        method:
          request.request.type === "message"
            ? "signMessage"
            : request.request.send
              ? "signAndSendTransaction"
              : "signTransaction",
        platform: "solana",
      }
  }
}

/**
 * The hostname, without port, for http and https. `ipfs:` and `ipns:` hosts are content hashes,
 * so they become the scheme name. Anything else is null.
 */
export const toDappDomain = (url: string | undefined): string | null => {
  if (!url) return null
  try {
    const { protocol, hostname } = new URL(url)
    if (protocol === "ipfs:" || protocol === "ipns:") return protocol.slice(0, -1)
    if (protocol !== "http:" && protocol !== "https:") return null
    const host = hostname.toLowerCase()
    return isHostname(host) ? host : null
  } catch {
    return null
  }
}

/**
 * "unscanned": no scan ran or none finished before the request ended. Connection requests carry
 * the site verdict only (malicious or unscanned).
 */
export const RISK_VERDICTS = ["benign", "warning", "malicious", "error", "unscanned"] as const
export type RiskVerdict = (typeof RISK_VERDICTS)[number]

export const REQUEST_OUTCOMES = ["approved", "rejected", "expired", "closed"] as const
export type RequestOutcome = (typeof REQUEST_OUTCOMES)[number]
