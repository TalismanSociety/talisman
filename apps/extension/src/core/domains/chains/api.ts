import gql from "graphql-tag"
import { print } from "graphql"

/*
// Please update the mock for this data in ./__mocks__/api.ts if you change this endpoint or the query.
*/
export const graphqlUrl = "https://app.gc.subsquid.io/beta/chaindata/latest/graphql"

const chaindataQuery = gql`
  {
    chains(orderBy: sortIndex_ASC) {
      id
      sortIndex
      isTestnet
      genesisHash
      prefix
      name
      chainName
      implName
      specName
      specVersion
      nativeToken {
        id
      }
      tokensCurrencyIdIndex
      tokens {
        id
      }
      account
      subscanUrl
      rpcs {
        url
        isHealthy
      }
      ethereumExplorerUrl
      ethereumRpcs {
        url
        isHealthy
      }
      ethereumId
      isHealthy
      parathreads(orderBy: paraId_ASC) {
        id
        paraId
      }
      paraId
      relay {
        id
      }
    }
  }
`
export const getChainData = async () => {
  const { data } = await (
    await fetch(graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: print(chaindataQuery) }),
    })
  ).json()
  return data
}
