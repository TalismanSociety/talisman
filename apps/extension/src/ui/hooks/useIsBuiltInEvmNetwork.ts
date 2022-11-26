import gql from "graphql-tag"
import { print } from "graphql"
import { graphqlUrl } from "@core/util/graphql"
import { useQuery } from "@tanstack/react-query"

const getIsBuiltInEvmNetwork = async (evmNetworkId?: number) => {
  if (!evmNetworkId) return null

  const query = gql`
      query {
        evmNetworkById(id:"${evmNetworkId}") {
          id
        }
      }
    `

  const request = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: print(query) }),
  })

  const response = await request.json()

  return !!response?.data?.evmNetworkById?.id
}

export const useIsBuiltInEvmNetwork = (evmNetworkId?: number) => {
  return useQuery({
    queryKey: ["useIsBuiltInEvmNetwork", evmNetworkId],
    queryFn: () => getIsBuiltInEvmNetwork(evmNetworkId),
  })
}
