import axios from "axios"
import { print } from "graphql"
import gql from "graphql-tag"

export const graphqlUrl = "https://app.gc.subsquid.io/beta/chaindata/v3/graphql"

//
// Fragments
//

export const ChainFragment = gql`
  fragment Chain on Chain {
    id
    isTestnet
    sortIndex
    genesisHash
    prefix
    name
    themeColor
    logo
    chainName
    implName
    specName
    specVersion
    nativeToken {
      id
    }
    tokens(orderBy: id_ASC) {
      id
    }
    account
    subscanUrl
    chainspecQrUrl
    latestMetadataQrUrl
    rpcs {
      url
      isHealthy
    }
    isHealthy
    evmNetworks(orderBy: name_ASC) {
      id
    }
    parathreads(orderBy: paraId_ASC) {
      id
      paraId
      name
    }
    paraId
    relay {
      id
    }
    balanceMetadata {
      moduleType
      metadata
    }
  }
`

export const EvmNetworkFragment = gql`
  fragment EvmNetwork on EvmNetwork {
    id
    isTestnet
    sortIndex
    name
    themeColor
    logo
    nativeToken {
      id
    }
    tokens(orderBy: id_ASC) {
      id
    }
    explorerUrl
    rpcs {
      url
      isHealthy
    }
    isHealthy
    substrateChain {
      id
    }
  }
`

export const TokenFragment = gql`
  fragment Token on Token {
    id
    data

    # TODO: Fix (add variants and their relations) when https://github.com/subsquid/squid/issues/41 is merged

    squidImplementationDetailNativeToChains(orderBy: sortIndex_ASC) {
      id
    }
    squidImplementationDetailNativeToEvmNetworks(orderBy: name_ASC) {
      id
    }
  }
`

//
// Queries
//

export const chainsQuery = gql`
  {
    chains(orderBy: sortIndex_ASC) {
      ...Chain
    }
  }
  ${ChainFragment}
`

export const evmNetworksQuery = gql`
  {
    evmNetworks(orderBy: sortIndex_ASC) {
      ...EvmNetwork
    }
  }
  ${EvmNetworkFragment}
`

export const getEvmNetworkByIdQuery = (evmNetworkId: string) => gql`
  {
    evmNetworkById(id:"${evmNetworkId}") {
      ...EvmNetwork
    }
  }
  ${EvmNetworkFragment}
`

export const tokensQuery = gql`
  {
    tokens(orderBy: id_ASC) {
      ...Token
    }
  }
  ${TokenFragment}
`

export const getTokenByIdQuery = (tokenId: string) => gql`
  {
    tokenById(id:"${tokenId}") {
      ...Token
    }
  }
  ${TokenFragment}
`

//
// Fetchers
//

export async function fetchChains(): Promise<any> {
  return await axios
    .post(graphqlUrl, { query: print(chainsQuery) })
    .then((response) => response.data)
}
export async function fetchEvmNetworks(): Promise<any> {
  return await axios
    .post(graphqlUrl, { query: print(evmNetworksQuery) })
    .then((response) => response.data)
}
export async function fetchEvmNetwork(evmNetworkId: string): Promise<any> {
  return await axios
    .post(graphqlUrl, { query: print(getEvmNetworkByIdQuery(evmNetworkId)) })
    .then((response) => response.data.data.evmNetworkById)
}
export async function fetchTokens(): Promise<any> {
  return await axios
    .post(graphqlUrl, { query: print(tokensQuery) })
    .then((response) => response.data)
}
export async function fetchToken(tokenId: string): Promise<any> {
  return await axios
    .post(graphqlUrl, { query: print(getTokenByIdQuery(tokenId)) })
    .then((response) => response.data.data.tokenById.data)
}
