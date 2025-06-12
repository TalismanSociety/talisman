import { Token } from "./Token"

export type DotToken = Extract<Token, { platform: "polkadot" }>
export type EthToken = Extract<Token, { platform: "ethereum" }>

export const isDotToken = (token: Token | null | undefined): token is DotToken => {
  return !!token && token.platform === "polkadot"
}

export const isEthToken = (token: Token | null | undefined): token is EthToken => {
  return !!token && token.platform === "ethereum"
}
