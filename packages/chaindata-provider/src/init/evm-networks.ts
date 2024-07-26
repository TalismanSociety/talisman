export const evmNetworks = [
  {
    id: "1",
    isTestnet: false,
    sortIndex: 274,
    name: "Ethereum Mainnet",
    themeColor: "#62688f",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/1.svg",
    nativeToken: null,
    tokens: [],
    explorerUrl: "https://etherscan.io",
    rpcs: [
      {
        url: "https://rpc.ankr.com/eth",
      },
      {
        url: "https://eth.api.onfinality.io/public",
      },
      {
        url: "https://eth.llamarpc.com",
      },
      {
        url: "https://ethereum.rpc.subquery.network/public",
      },
    ],
    substrateChain: null,
    balancesConfig: [
      {
        moduleType: "evm-native",
        moduleConfig: {
          coingeckoId: "ethereum",
          dcentName: "ETHEREUM",
          symbol: "ETH",
          decimals: 18,
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/eth.svg",
        },
      },
      {
        moduleType: "evm-erc20",
        moduleConfig: {
          tokens: [
            {
              symbol: "USDC",
              contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
              coingeckoId: "usd-coin",
              isDefault: true,
              decimals: 6,
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/usd-coin.webp",
            },
            {
              symbol: "DAI",
              contractAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
              coingeckoId: "dai",
              isDefault: true,
              decimals: 18,
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/dai.webp",
            },
          ],
        },
      },
      {
        moduleType: "evm-uniswapv2",
        moduleConfig: {
          pools: [],
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
        },
      },
    ],
    balancesMetadata: [],
    isDefault: true,
  },
]
