export const evmNetworks = [
  {
    id: "1",
    isTestnet: false,
    sortIndex: 324,
    name: "Ethereum Mainnet",
    themeColor: "#62688f",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/1.svg",
    nativeToken: null,
    tokens: [],
    explorerUrl: "https://etherscan.io",
    rpcs: [
      {
        url: "https://mempool.merkle.io/rpc/eth/pk_mbs_1412a7392bd47753ca2b4bb3d123f6a1",
      },
      {
        url: "https://rpc.ankr.com/eth",
      },
      {
        url: "https://ethereum-rpc.publicnode.com",
      },
      {
        url: "https://eth.merkle.io",
      },
      {
        url: "https://ethereum.rpc.subquery.network/public",
      },
      {
        url: "https://eth.llamarpc.com",
      },
    ],
    substrateChain: null,
    feeType: "eip-1559",
    erc20aggregator: "0x2e556284556ecEe5754d201bBB6E2cb47fB95DFd",
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
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/usdc.svg",
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
