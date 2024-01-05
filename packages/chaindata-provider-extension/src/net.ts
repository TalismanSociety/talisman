import {
  chaindataChainByIdUrl,
  chaindataChainsAllUrl,
  chaindataEvmNetworkByIdUrl,
  chaindataEvmNetworksAllUrl,
  chaindataMiniMetadatasAllUrl,
  chaindataTokenByIdUrl,
  chaindataTokensAllUrl,
  githubApi,
  githubChaindataOrg,
  githubChaindataRepo,
  githubChaindataTokensAssetsDir,
} from "@talismn/chaindata-provider"

export const fetchChains = async () => await (await fetch(chaindataChainsAllUrl)).json()
export const fetchChain = async (chainId: string) =>
  await (await fetch(chaindataChainByIdUrl(chainId))).json()

export const fetchEvmNetworks = async () => await (await fetch(chaindataEvmNetworksAllUrl)).json()
export const fetchEvmNetwork = async (evmNetworkId: string) =>
  await (await fetch(chaindataEvmNetworkByIdUrl(evmNetworkId))).json()

export const fetchTokens = async () => await (await fetch(chaindataTokensAllUrl)).json()
export const fetchToken = async (tokenId: string) =>
  await (await fetch(chaindataTokenByIdUrl(tokenId))).json()

export const fetchMiniMetadatas = async () =>
  await (await fetch(chaindataMiniMetadatasAllUrl)).json()

export const availableTokenLogoFilenames = async (): Promise<string[]> =>
  (
    await fetch(
      `${githubApi}/repos/${githubChaindataOrg}/${githubChaindataRepo}/contents/${githubChaindataTokensAssetsDir}`
    ).then((response) => response.json())
  ).flatMap((entry: unknown) => {
    if (typeof entry !== "object" || entry === null) return []
    if (!("name" in entry) || typeof entry.name !== "string") return []
    return entry.name
  })
