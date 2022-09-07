import { ChainFragment, ChainIsHealthyFragment, graphqlUrl } from "@core/util/graphql"
import { DocumentNode, print } from "graphql"
import gql from "graphql-tag"

/*
// Please update the mock for this data in ./__mocks__/api.ts if you change this endpoint or the query.
*/

export const chainsQuery = gql`
  {
    chains(orderBy: sortIndex_ASC) {
      ...Chain
    }
  }
  ${ChainFragment}
`

export const chainsIsHealthyQuery = gql`
  {
    chains(orderBy: sortIndex_ASC) {
      ...ChainIsHealthy
    }
  }
  ${ChainIsHealthyFragment}
`

const getChainsWithQuery = (query: DocumentNode) => async () => {
  const { data } = await (
    await fetch(graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: print(query) }),
    })
  ).json()

  return data?.chains || []
}

export const getChains = getChainsWithQuery(chainsQuery)

export const getChainsIsHealthyOnly = getChainsWithQuery(chainsIsHealthyQuery)
