import { isTokenInTypes, type Token } from "@talismn/chaindata-provider"

const GOPLUS_CHAIN_BY_NETWORK_ID: Record<string, string> = {
  "1": "1",
  "10": "10",
  "25": "25",
  "56": "56",
  "100": "100",
  "130": "130",
  "137": "137",
  "143": "143",
  "146": "146",
  "169": "169",
  "177": "177",
  "185": "185",
  "196": "196",
  "204": "204",
  "321": "321",
  "324": "324",
  "480": "480",
  "988": "988",
  "1030": "1030",
  "1514": "1514",
  "1625": "1625",
  "1672": "1672",
  "1868": "1868",
  "2741": "2741",
  "2818": "2818",
  "4200": "4200",
  "4663": "4663",
  "5000": "5000",
  "5042": "5042",
  "8453": "8453",
  "9745": "9745",
  "42161": "42161",
  "42766": "42766",
  "43114": "43114",
  "48900": "48900",
  "59144": "59144",
  "80094": "80094",
  "81457": "81457",
  "200901": "200901",
  "201022": "201022",
  "534352": "534352",
  "810180": "810180",
  "5734951": "5734951",
  "solana-mainnet": "solana",
}

const getTokenAddress = (token: Token) => {
  if (isTokenInTypes(token, ["evm-erc20", "evm-uniswapv2"])) return token.contractAddress
  if (isTokenInTypes(token, ["sol-spl", "sol-token2022"])) return token.mintAddress
  return null
}

export const getGoPlusReportUrl = (token: Token | null | undefined) => {
  if (!token) return null
  const chain = GOPLUS_CHAIN_BY_NETWORK_ID[token.networkId]
  const address = getTokenAddress(token)
  if (!chain || !address) return null
  return `https://gopluslabs.io/token-security/${chain}/${address}`
}
