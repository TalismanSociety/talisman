import { startCase, uniq } from "lodash-es"

import { Network } from "./chaindata"

export type BlockExplorerQuery =
  | {
      type: "address"
      // to be used for contracts mainly, otherwise use "account"
      address: string
    }
  | {
      type: "account"
      address: string
    }
  | {
      type: "transaction"
      // hash for most networks, signature for solana
      id: string
    }
  | {
      type: "block"
      // block number for most networks, block hash for polkadot.js, slot for solana
      id: string | number | bigint
    }
  | {
      type: "extrinsic"
      blockNumber: number | bigint
      extrinsicIndex: number
    }
  | {
      type: "extrinsic-unknown"
      hash: `0x${string}`
    }

export const getBlockExplorerUrls = (network: Network, query: BlockExplorerQuery): string[] => {
  return uniq(
    network.blockExplorerUrls
      .map((explorerUrl) => getExplorerUrl(explorerUrl, query, network.rpcs?.[0]))
      .filter(Boolean) as string[],
  )
}

const getExplorerUrl = (
  explorerUrl: string,
  query: BlockExplorerQuery,
  rpcUrl?: string,
): string | null => {
  if (explorerUrl.includes("{RPC_URL}")) {
    if (!rpcUrl) return null
    // rpc url is always in the query string, use encodeURIComponent
    explorerUrl = explorerUrl.replace("{RPC_URL}", encodeURIComponent(rpcUrl))
  }

  const url = new URL(explorerUrl)
  const host = getExplorerHost(url)
  const path = getQueryPath(query, host)

  if (!path) return null // path is not supported by the host

  switch (host) {
    case "polkadot.js":
      url.pathname = `/apps/`
      url.hash = path
      break
    case "statescan.io":
      url.pathname = `/`
      url.hash = path
      break
    default:
      // for other explorers, just append the path
      url.pathname = path
      break
  }

  return url.toString()
}

type ExplorerHost =
  | "polkadot.js"
  | "avail.so"
  | "statescan.io"
  | "taostats.io"
  | "subscan.io"
  | "etherscan.io"
  | "solscan.io"
  | "blockscout.com"
  | "moonscan.io"
  | (string & {})

const getExplorerHost = (explorerUrl: URL): ExplorerHost => {
  const hostname = explorerUrl.hostname.toLowerCase()

  if (explorerUrl.hostname.endsWith("polkadot.js.org")) return "polkadot.js"

  // last 2 parts of the hostname
  const parts = hostname.split(".")
  return parts.length > 2 ? parts.slice(-2).join(".") : hostname
}

const getQueryPath = (query: BlockExplorerQuery, host: ExplorerHost): string | null => {
  switch (query.type) {
    case "transaction":
      switch (host) {
        case "avail.so":
        case "polkadot.js":
          return null
        case "statescan.io":
          return `/extrinsics/${query.id}`
        case "taostats.io":
          return `/hash/${query.id}`
        default:
          return `/tx/${query.id}`
      }
    case "address":
      switch (host) {
        case "avail.so":
        case "polkadot.js":
          return null
        case "statescan.io":
        case "subscan.io":
          return `/accounts/${query.address}`
        case "taostats.io":
          return `/account/${query.address}`
        default:
          return `/address/${query.address}`
      }
    case "account": {
      switch (host) {
        case "avail.so":
        case "polkadot.js":
          return null
        case "statescan.io":
          return `/accounts/${query.address}`
        default:
          return `/account/${query.address}`
      }
    }
    case "block": {
      const isNumber = typeof query.id !== "string" || /^\d+$/.test(query.id)
      switch (host) {
        case "avail.so":
        case "polkadot.js":
          return isNumber ? null : `/explorer/query/${query.id}` // supports block hash only
        case "statescan.io":
          return isNumber ? `/blocks/${query.id}` : null
        case "taostats.io":
          return isNumber ? `/block/${query.id}/extrinsics` : null
        default:
          return isNumber ? `/block/${query.id}` : null
      }
    }
    case "extrinsic": {
      switch (host) {
        case "avail.so":
        case "polkadot.js":
          return null // unsupported
        case "statescan.io":
          return `/extrinsics/${query.blockNumber}-${query.extrinsicIndex}`
        case "taostats.io":
          return `/extrinsic/${query.blockNumber}-${query.extrinsicIndex.toString().padStart(4, "0")}`
        default:
          return `/extrinsic/${query.blockNumber}-${query.extrinsicIndex}`
      }
    }
    case "extrinsic-unknown": {
      switch (host) {
        case "subscan.io":
          return `/tx/${query.hash}`
        default:
          return null
      }
    }
    default:
      return null // unsupported query type
  }
}

export const getBlockExplorerLabel = (blockExplorerUrl: string): string => {
  const url = new URL(blockExplorerUrl)
  const host = getExplorerHost(url)

  switch (host) {
    case "polkadot.js":
      return "Polkadot.js"
    default: {
      const parts = url.hostname.split(".")
      return parts.length === 2 ? startCase(parts[0]) : host
    }
  }
}
