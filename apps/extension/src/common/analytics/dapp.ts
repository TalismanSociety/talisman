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
  "signVrf",
  "signMessage",
  "signTransaction",
  "signAndSendTransaction",
] as const
export type DappMethod = (typeof DAPP_METHODS)[number]

export type DappRequestKind = { method: DappMethod; platform: ChainPlatform }

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

export const RISK_VERDICTS = ["benign", "warning", "malicious", "error", "unscanned"] as const
export type RiskVerdict = (typeof RISK_VERDICTS)[number]

export const PROTECTION_SOURCES = ["lists", "blockaid"] as const

export const REQUEST_OUTCOMES = ["approved", "rejected", "expired", "closed"] as const
export type RequestOutcome = (typeof REQUEST_OUTCOMES)[number]
