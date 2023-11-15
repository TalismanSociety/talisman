export const data = {
  password: (process.env.TESTING_PASSWORD as string) || "password123",
  seedPhrase: "test test test test test test test test test test test junk",
  dotAccountName: "My Polkadot",
  dotName: "Polkadot",
  ethName: "Ethereum",
  dotAddress: "1YmEYgtfPbwx5Jos1PjKDWRpuJWSpTzytwZgYan6kgiquNS",
  ethAddress: "0x13f71F57cd0FF4d3ca1129F369a0895B8E743Cc6",
  ethTestnet: "Goerli",
  evmNetworks: [
    {
      rpc: "https://rpc.dogechain.dog",
      rpc2: "https://rpc.ankr.com/dogechain",
      chainId: "2000",
      name: "Dogechain Mainnet",
      tokenSymbol: "DOGE",
      tokenDecimals: "18",
      blockExplorerUrl: "https://explorer.dogechain.dog",
      tokenCoingeckoId: "dogecoin",
      testnet: false,
    },
    {
      rpc: "https://rpc-mumbai.maticvigil.com",
      rpc2: "https://rpc.ankr.com/polygon_mumbai",
      chainId: "80001",
      name: "Mumbai",
      tokenSymbol: "MATIC",
      tokenDecimals: "18",
      blockExplorerUrl: "https://mumbai.polygonscan.com",
      tokenCoingeckoId: "matic-network",
      testnet: true,
    },
  ],
}

export default data
