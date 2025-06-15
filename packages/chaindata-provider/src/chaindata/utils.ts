import { DotNetwork, EthNetwork, Network } from "./networks"
import { Token } from "./tokens"

export type DotToken = Extract<Token, { platform: "polkadot" }>
export type EthToken = Extract<Token, { platform: "ethereum" }>

export const isDotToken = (token: Token | null | undefined): token is DotToken => {
  return !!token && token.platform === "polkadot"
}

export const isEthToken = (token: Token | null | undefined): token is EthToken => {
  return !!token && token.platform === "ethereum"
}

export const isDotNetwork = (network: Network | null | undefined): network is DotNetwork => {
  return !!network && network.platform === "polkadot"
}

export const isEthNetwork = (network: Network | null | undefined): network is EthNetwork => {
  return !!network && network.platform === "ethereum"
}
