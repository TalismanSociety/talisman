import { CustomEvmErc20Token, evmErc20TokenId } from "@talismn/balances"
import { useChaindataProvider, useEvmNetworks } from "@talismn/balances-react"
import { githubUnknownTokenLogoUrl } from "@talismn/chaindata-provider"
import { useEffect, useMemo } from "react"

export type CustomTokensConfig = CustomTokenConfig[]
export type CustomTokenConfig = {
  evmChainId: string
  contractAddress: string
  symbol: string
  decimals: number
  coingeckoId?: string
}

export const useSetCustomTokens = (customTokensConfig: CustomTokensConfig) => {
  const chaindataProvider = useChaindataProvider()
  const customTokensConfigMemoised = useMemo(
    () => customTokensConfig,
    [JSON.stringify(customTokensConfig)] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const evmNetworks = useEvmNetworks()

  useEffect(() => {
    const customTokens = customTokensConfigMemoised.map(
      ({ evmChainId, symbol, decimals, contractAddress, coingeckoId }): CustomEvmErc20Token => ({
        id: evmErc20TokenId(evmChainId, contractAddress),
        type: "evm-erc20",
        isTestnet: evmNetworks[evmChainId]?.isTestnet || false,
        symbol,
        decimals: decimals,
        logo: githubUnknownTokenLogoUrl,
        coingeckoId,
        contractAddress,
        evmNetwork: { id: evmChainId },
        isCustom: true,
      })
    )

    chaindataProvider.setCustomTokens(customTokens)
  }, [chaindataProvider, customTokensConfigMemoised, evmNetworks])
}
