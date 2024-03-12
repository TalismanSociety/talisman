import keyring from "@polkadot/ui-keyring"
import { cryptoIsReady, encodeAddress, isEthereumAddress } from "@polkadot/util-crypto"
import { print } from "graphql"
import gql from "graphql-tag"

const RMRK_GRAPHQL_URL = "https://gql.rmrk.link/v1/graphql"
const SPIRIT_KEYS_COLLECTION_ID = "b6e98494bff52d3b1e-SPIRIT"
const KUSAMA_SS58_PREFIX = 2

export const fetchHasSpiritKey = async () => {
  if (!cryptoIsReady()) throw new Error("Crypto not ready")

  const ksmAddresses = keyring
    .getAccounts()
    .filter((acc) => !isEthereumAddress(acc.address))
    .filter((acc) => !acc.meta?.isExternal || acc.meta?.isHardware)
    .map((acc) => encodeAddress(acc.publicKey, KUSAMA_SS58_PREFIX))

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
