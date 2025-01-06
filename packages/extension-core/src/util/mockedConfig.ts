// TODO: Delete this once talisman-config PR-10 is merged

export const mockedConfig = `
[featureFlags]
BUY_CRYPTO = true               # shows the buy crypto button in the wallet
LINK_TX_HISTORY = true          # shows the transaction history link in the wallet
LINK_STAKING = true             # shows the staking link in the wallet
I18N = false                    # enables internationalization
USE_ONFINALITY_API_KEY = false  # enables the use of the onFinality API key
QUEST_LINK = true               # enables quest link in portfolio header

# RISK_ANALYSIS = true          # enables risk analysis feature

[rampSupportedTokenIds]
# Key naming convention is CHAIN_SYMBOL
POLKADOT_DOT = "polkadot-substrate-native"
DOT_DOT = "polkadot-asset-hub-substrate-native"
KUSAMA_KSM = "kusama-substrate-native"
DOT_USDC = "polkadot-asset-hub-substrate-assets-1337-usdc"
DOT_USDT = "polkadot-asset-hub-substrate-assets-1984-usdt"
MATIC_POL = "137-evm-native"
ETH_USDT = "1-evm-erc20-0xdac17f958d2ee523a2206206994597c13d831ec7"
ARBITRUM_USDT = "42161-evm-erc20-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
OPTIMISM_USDT = "10-evm-erc20-0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
MATIC_USDT = "137-evm-erc20-0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
ETH_USDC = "1-evm-erc20-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
BASE_USDC = "8453-evm-erc20-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
ARBITRUM_USDC = "42161-evm-erc20-0xaf88d065e77c8cc2239327c5edb3a432268e5831"
MATIC_USDC = "137-evm-erc20-0x3c499c542cef5e3811e1192ce70d8cc03d5c3359"
OPTIMISM_USDC = "10-evm-erc20-0x0b2c639c533813f4aa9d7837caf62653d097ff85"
ETH_ETH = "1-evm-native"
OPTIMISM_ETH = "10-evm-native"
ARBITRUM_ETH = "42161-evm-native"
BASE_ETH = "8453-evm-native"
MATIC_ETH = "137-evm-erc20-0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"

[buyTokens]
tokenIds = [
    "polkadot-substrate-native-dot",   # keep old native token ids format to prevent breaking old builds
    "polkadot-substrate-native",
    "kusama-substrate-native-ksm",
    "kusama-substrate-native",
    "moonbeam-substrate-native-glmr",
    "moonbeam-substrate-native",
    "moonriver-substrate-native-movr",
    "moonriver-substrate-native",
    "ternoa-substrate-native-caps",
    "ternoa-substrate-native",
    "1-evm-native-eth",
    "1-evm-native",
    "56-evm-native-bnb",
    "56-evm-native",
    "137-evm-native-matic",
    "137-evm-native",
]

[coingecko]
apiUrl = "https://cgp.talisman.xyz"

[nominationPools]
polkadot = [282, 12, 16]
kusama = [15]
avail = [66, 68, 2]
vara = [8]
aleph-zero = [47]
cere = [1]

[stakingPools]
bittensor = ["5ELREhApbCahM7FyGLM1V9WDsnnjCRmMCJTmtQD51oAEqwVh"]

`
