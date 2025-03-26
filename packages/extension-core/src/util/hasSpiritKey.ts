import { encodeAddressSs58 } from "@talismn/crypto"
import { isAccountOwned, isAccountPolkadot } from "@talismn/keyring"
import { print } from "graphql"
import gql from "graphql-tag"

import { keyringStore } from "../domains/keyring/store"

const RMRK_GRAPHQL_URL = "https://gql.rmrk.link/v1/graphql"
const SPIRIT_KEYS_COLLECTION_ID = "b6e98494bff52d3b1e-SPIRIT"
const KUSAMA_SS58_PREFIX = 2

export const fetchHasSpiritKey = async () => {
  const accounts = await keyringStore.getAccounts()

  const ksmAddresses = accounts
    .filter(isAccountPolkadot)
    .filter(isAccountOwned)
    .map((acc) => encodeAddressSs58(acc.address, KUSAMA_SS58_PREFIX))

  const query = gql`
          query {
            nfts(
              where: {
                owner: { _in: [${ksmAddresses.map((addr) => `"${addr}"`).join(",")}] }
                collectionId: { _eq: "${SPIRIT_KEYS_COLLECTION_ID}" }
              }
            ) {
              id
            }
          }
        `

  const { data } = await (
    await fetch(RMRK_GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: print(query) }),
    })
  ).json()

  return !!data?.nfts.length
}
