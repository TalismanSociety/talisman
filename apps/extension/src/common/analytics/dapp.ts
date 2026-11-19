import type { ValidRequests } from "@core/libs/requests/types"

import type { ChainPlatform } from "./transactions"

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
  "createTransaction",
  "signVrf",
  "signMessage",
  "signTransaction",
  "signAndSendTransaction",
] as const
export type DappMethod = (typeof DAPP_METHODS)[number]

export const DAPP_REQUEST_TYPES = [
  "transaction",
  "message",
  "connect",
  "add_network",
  "watch_asset",
] as const
export type DappRequestType = (typeof DAPP_REQUEST_TYPES)[number]

const REQUEST_TYPE_OF_METHOD: Record<DappMethod, DappRequestType> = {
  signPayload: "transaction",
  eth_sendTransaction: "transaction",
  createTransaction: "transaction",
  signTransaction: "transaction",
  signAndSendTransaction: "transaction",
  signRaw: "message",
  signVrf: "message",
  personal_sign: "message",
  eth_signTypedData: "message",
  eth_signTypedData_v1: "message",
  eth_signTypedData_v3: "message",
  eth_signTypedData_v4: "message",
  signMessage: "message",
  signIn: "message",
  connect: "connect",
  wallet_addEthereumChain: "add_network",
  wallet_watchAsset: "watch_asset",
}

export const isSigningRequestType = (type: DappRequestType) =>
  type === "transaction" || type === "message"

const PRIVATE_SUFFIXES = [
  ".local",
  ".lan",
  ".home",
  ".internal",
  ".intranet",
  ".corp",
  ".localhost",
  ".test",
  ".example",
  ".invalid",
  ".onion",
  ".arpa",
  ".ts.net",
]

const HOSTNAME =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/

const CONTENT_ADDRESSED_SCHEMES = ["ipfs", "ipns"] as const

const isPrivateHost = (host: string): boolean =>
  host === "localhost" ||
  !host.includes(".") ||
  host.startsWith("[") ||
  /^\d+(\.\d+){3}$/.test(host) ||
  PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix))

export const toDappDomain = (url: string | undefined): string | null => {
  if (!url || !URL.canParse(url)) return null
  const { protocol, hostname } = new URL(url)
  const scheme = protocol.slice(0, -1)
  if ((CONTENT_ADDRESSED_SCHEMES as readonly string[]).includes(scheme)) return scheme
  if (protocol !== "http:" && protocol !== "https:") return null
  const host = hostname.toLowerCase().replace(/\.$/, "")
  if (!HOSTNAME.test(host) || isPrivateHost(host)) return null
  return host
}

export const isDappDomain = (value: string): boolean =>
  (CONTENT_ADDRESSED_SCHEMES as readonly string[]).includes(value) ||
  toDappDomain(`https://${value}/`) === value

export type DappRequestKind = {
  method: DappMethod
  platform: ChainPlatform
  requestType: DappRequestType
  dappDomain: string | null
}

export const describeDappRequest = (request: ValidRequests): DappRequestKind => {
  const { method, platform } = methodOf(request)
  return {
    method,
    platform,
    requestType: REQUEST_TYPE_OF_METHOD[method],
    dappDomain: toDappDomain(request.url),
  }
}

const methodOf = (request: ValidRequests): { method: DappMethod; platform: ChainPlatform } => {
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
        method:
          request.request.method ??
          ("genesisHash" in request.request.payload ? "signPayload" : "signRaw"),
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

export const RISK_VERDICTS = ["benign", "warning", "malicious", "error", "unscanned"] as const
export type RiskVerdict = (typeof RISK_VERDICTS)[number]

export const PROTECTION_SOURCES = ["lists", "blockaid"] as const

export const REQUEST_OUTCOMES = ["approved", "rejected", "failed", "expired", "closed"] as const
export type RequestOutcome = (typeof REQUEST_OUTCOMES)[number]
