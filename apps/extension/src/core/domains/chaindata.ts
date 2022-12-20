import { db } from "@core/libs/db"
import {
  CustomChain,
  CustomEvmNetwork,
  Token,
  githubUnknownTokenLogoUrl,
} from "@talismn/chaindata-provider"
import { ChaindataProviderExtension } from "@talismn/chaindata-provider-extension"

export const chaindataProvider = new ChaindataProviderExtension()

/**
 *  Migrate custom chains/networks/tokens from the old (v2 / split-entities) database to the new (v3) chaindata database.
 */
export async function attemptCustomChainsAndTokensMigration() {
  // wait for db connection to be ready
  await new Promise((resolve) => db.on("ready", resolve))

  // retrieve legacy data
  const [chains, evmNetworks, tokens] = await Promise.all([
    db.chains.toArray(),
    db.evmNetworks.toArray(),
    db.tokens.toArray(),
  ])

  // don't migrate if no legacy data exists
  if (chains.length < 1 && evmNetworks.length < 1 && tokens.length < 1) return

  // filter by custom entries
  const isCustom = (entry: unknown) =>
    typeof entry === "object" && entry !== null && "isCustom" in entry && entry.isCustom
  const customChains = chains.filter(isCustom)
  const customEvmNetworks = evmNetworks.filter(isCustom)
  const customTokens = tokens.filter(isCustom)

  // set up some helper functions
  const migrateTokenId = (tokenId: string, { evm }: { evm?: boolean }) =>
    tokenId
      .replace(/-native-/, evm ? "-evm-native-" : "-substrate-native-")
      .replace(/-orml-/, "-substrate-orml-")
      .replace(/-erc20-/, "-evm-erc20-")

  const migrateTokenType = (tokenType: string, { evm }: { evm?: boolean }) => {
    if (tokenType === "native") return evm ? "evm-native" : "substrate-native"
    if (tokenType === "orml") return "substrate-orml"
    if (tokenType === "erc20") return "evm-erc20"
    return tokenType
  }

  const migrateRelatedTokenIds = (chainOrEvmNetwork: any, { evm }: { evm?: boolean }) => {
    // update nativeToken id
    const nativeTokenId = chainOrEvmNetwork?.nativeToken?.id
    if (nativeTokenId) chainOrEvmNetwork.nativeToken.id = migrateTokenId(nativeTokenId, { evm })

    // update other token ids
    Array.isArray(chainOrEvmNetwork.tokens) &&
      chainOrEvmNetwork.tokens.forEach((token: any) => {
        const tokenId = token?.id
        if (tokenId) token.id = migrateTokenId(tokenId, { evm })
      })
  }

  // set up a counter for the number of migrated entries
  const counters = { chains: 0, evmNetworks: 0, tokens: 0 }

  // add custom chains to the new db
  customChains.forEach((chain: any) => {
    // update related token ids
    migrateRelatedTokenIds(chain, { evm: false })

    // update chain logo
    chain.logo = githubUnknownTokenLogoUrl

    // add custom chain
    chaindataProvider.addCustomChain(chain as CustomChain)
    counters.chains++
  })

  // add custom evmNetworks to the new db
  customEvmNetworks.forEach((evmNetwork: any) => {
    // update related token ids
    migrateRelatedTokenIds(evmNetwork, { evm: true })

    // update evmNetwork id
    const evmNetworkId = evmNetwork?.id
    if (["string", "number"].includes(typeof evmNetworkId)) evmNetwork.id = evmNetworkId.toString()

    // update evmNetwork logo
    evmNetwork.logo = (evmNetwork?.iconUrls || [])[0] || githubUnknownTokenLogoUrl

    // add custom evm network
    chaindataProvider.addCustomEvmNetwork(evmNetwork as CustomEvmNetwork)
    counters.evmNetworks++
  })

  // add custom tokens to the new db
  customTokens.forEach((token: any) => {
    // update token id and related evmNetwork id
    const tokenId = token?.id
    const evm = ["string", "number"].includes(typeof token?.evmNetwork?.id)
    if (tokenId) token.id = migrateTokenId(tokenId, { evm })
    if (evm) token.evmNetwork.id = token.evmNetwork.id.toString()

    // update token type
    const tokenType = token?.type
    if (tokenType) token.type = migrateTokenType(tokenType, { evm })

    // update token logo
    token.logo = token?.image ?? githubUnknownTokenLogoUrl

    // add custom token
    chaindataProvider.addCustomToken(token as Token)
    counters.tokens++
  })

  // migration complete, delete entries from the old db
  await Promise.all([db.chains.clear(), db.evmNetworks.clear(), db.tokens.clear()])

  // eslint-disable-next-line no-console
  console.log(
    `Migrated ${[
      counters.chains && `${counters.chains} chains`,
      counters.evmNetworks && `${counters.evmNetworks} evmNetworks`,
      counters.tokens && `${counters.tokens} tokens`,
    ]
      .filter(Boolean)
      .join(" and ")}.`
  )
}
