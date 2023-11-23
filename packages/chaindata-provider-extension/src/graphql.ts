import { request } from "graphql-request"

import { graphqlUrl } from "./constants"
import { graphql } from "./graphql-codegen"

//
// Fragments
//

export const ChainFragment = graphql(`
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
    isUnknownFeeToken
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
`)

export const EvmNetworkFragment = graphql(`
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
`)

export const TokenFragment = graphql(`
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
`)

//
// Queries
//

export const chainsQuery = graphql(`
  query chains {
    chains(orderBy: sortIndex_ASC) {
      ...Chain
    }
  }
`)

export const chainByIdQuery = graphql(`
  query chainById($chainId: String!) {
    chainById(id: $chainId) {
      ...Chain
    }
  }
`)

export const evmNetworksQuery = graphql(`
  query evmNetworks {
    evmNetworks(orderBy: sortIndex_ASC) {
      ...EvmNetwork
    }
  }
`)

export const evmNetworkByIdQuery = graphql(`
  query evmNetworkById($evmNetworkId: String!) {
    evmNetworkById(id: $evmNetworkId) {
      ...EvmNetwork
    }
  }
`)

export const tokensQuery = graphql(`
  query tokens {
    tokens(orderBy: id_ASC) {
      ...Token
    }
  }
`)

export const tokenByIdQuery = graphql(`
  query tokenById($tokenId: String!) {
    tokenById(id: $tokenId) {
      ...Token
    }
  }
`)

//
// Fetchers
//

export const fetchChains = async () => (await request(graphqlUrl, chainsQuery)).chains
export const fetchChain = async (chainId: string) =>
  (await request(graphqlUrl, chainByIdQuery, { chainId })).chainById

export const fetchEvmNetworks = async () =>
  (await request(graphqlUrl, evmNetworksQuery)).evmNetworks
export const fetchEvmNetwork = async (evmNetworkId: string) =>
  (await request(graphqlUrl, evmNetworkByIdQuery, { evmNetworkId })).evmNetworkById

export const fetchTokens = async () => (await request(graphqlUrl, tokensQuery)).tokens
export const fetchToken = async (tokenId: string) =>
  (await request(graphqlUrl, tokenByIdQuery, { tokenId })).tokenById?.data
