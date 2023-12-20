export type SignetVault = {
  address: string
  name: string
  chain: {
    squidIds: {
      chainData: string
      txHistory: string
    }
    chainName: string
    logo: string
    genesisHash: `0x${string}`
    isTestnet: boolean
  }
}
