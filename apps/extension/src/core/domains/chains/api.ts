import { ChainFragment, graphqlUrl } from "@core/util/graphql"
import { print } from "graphql"
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

export const getChains = async () => {
  const { data } = await (
    await fetch(graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: print(chainsQuery) }),
    })
  ).json()

  return data?.chains || []
}
