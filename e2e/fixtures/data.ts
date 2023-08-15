export const data = {
	seedPhrase: process.env.SEED_PHRASE as string,
	password: process.env.PASSWORD as string,
	dotName: 'Polkadot',
	ethName: 'Ethereum',
	dotAddress: '1YmEYgtfPbwx5Jos1PjKDWRpuJWSpTzytwZgYan6kgiquNS',
	ethAddress: '0x13f71F57cd0FF4d3ca1129F369a0895B8E743Cc6',
	evmNetworks: [
		{
			rpc: 'https://rpc.dogechain.dog',
			rpc2: 'https://rpc.ankr.com/dogechain',
			chainId: '2000',
			name: 'Dogechain Mainnet',
			tokenSymbol: 'DOGE',
			tokenDecimals: '18',
			blockExplorerUrl: 'https://explorer.dogechain.dog',
			tokenCoingeckoId: 'dogecoin',
			testnet: true
		},
		{
			rpc: 'https://evm.kava.io',
			rpc2: 'https://kava-evm.publicnode.com',
			chainId: '2222',
			name: 'Kava EVM',
			tokenSymbol: 'KAVA',
			tokenDecimals: '18',
			blockExplorerUrl: 'https://explorer.kava.io',
			tokenCoingeckoId: 'kava',
			testnet: true
		},
	]
};

export default data;