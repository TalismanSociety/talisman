import type { AnyMiniMetadata, Network } from "../chaindata"
import type { DotNetwork } from "../chaindata/networks/DotNetwork"
import type { EthNetwork } from "../chaindata/networks/EthNetwork"
import type { SolNetwork } from "../chaindata/networks/SolNetwork"
import type { EvmNativeToken } from "../chaindata/tokens/EvmNativeToken"
import type { SolNativeToken } from "../chaindata/tokens/SolNativeToken"
import type { SubDTaoToken } from "../chaindata/tokens/SubstrateDTaoToken"
import type { SubNativeToken } from "../chaindata/tokens/SubstrateNativeToken"
import type { Chaindata, CustomChaindata } from "../state/schema"

// ─── Networks ──────────────────────────────────────────────────────

export const makeDotNetwork = (overrides: Partial<DotNetwork> = {}): DotNetwork => ({
  id: "polkadot",
  name: "Polkadot",
  nativeTokenId: "polkadot-substrate-native",
  nativeCurrency: { decimals: 10, symbol: "DOT", name: "Polkadot" },
  platform: "polkadot",
  chainName: "Polkadot",
  specName: "polkadot",
  specVersion: 1_000_000,
  account: "*25519",
  prefix: 0,
  rpcs: ["wss://rpc.polkadot.io"],
  genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
  topology: { type: "relay" },
  blockExplorerUrls: [],
  ...overrides,
})

export const makeEthNetwork = (overrides: Partial<EthNetwork> = {}): EthNetwork => ({
  id: "1",
  name: "Ethereum Mainnet",
  nativeTokenId: "1-evm-native",
  nativeCurrency: { decimals: 18, symbol: "ETH", name: "Ether" },
  platform: "ethereum",
  rpcs: ["https://eth.llamarpc.com"],
  blockExplorerUrls: [],
  ...overrides,
})

const makeSolNetwork = (overrides: Partial<SolNetwork> = {}): SolNetwork => ({
  id: "solana",
  name: "Solana",
  nativeTokenId: "solana-sol-native",
  nativeCurrency: { decimals: 9, symbol: "SOL", name: "Solana" },
  platform: "solana",
  genesisHash: "5eykt4UsFv2P6ysrq6Mtp6tsruy5JKstqPfn3xo5Tac",
  rpcs: ["https://api.mainnet-beta.solana.com"],
  blockExplorerUrls: [],
  ...overrides,
})

// ─── Tokens ────────────────────────────────────────────────────────

export const makeSubNativeToken = (overrides: Partial<SubNativeToken> = {}): SubNativeToken => ({
  id: "polkadot-substrate-native",
  networkId: "polkadot",
  type: "substrate-native",
  platform: "polkadot",
  decimals: 10,
  symbol: "DOT",
  existentialDeposit: "10000000000",
  ...overrides,
})

export const makeEvmNativeToken = (overrides: Partial<EvmNativeToken> = {}): EvmNativeToken => ({
  id: "1-evm-native",
  networkId: "1",
  type: "evm-native",
  platform: "ethereum",
  decimals: 18,
  symbol: "ETH",
  ...overrides,
})

const makeSolNativeToken = (overrides: Partial<SolNativeToken> = {}): SolNativeToken => ({
  id: "solana-sol-native",
  networkId: "solana",
  type: "sol-native",
  platform: "solana",
  decimals: 9,
  symbol: "SOL",
  ...overrides,
})

export const makeSubDTaoToken = (
  overrides: Partial<SubDTaoToken> = {}
): Omit<SubDTaoToken, "isTransferable"> & { isTransferable?: boolean } => ({
  id: "polkadot-substrate-dtao-0-hotkey",
  networkId: "polkadot",
  type: "substrate-dtao",
  platform: "polkadot",
  decimals: 9,
  symbol: "dTAO",
  netuid: 0,
  ...overrides,
})

// ─── MiniMetadata ──────────────────────────────────────────────────

export const makeMiniMetadata = (overrides: Partial<AnyMiniMetadata> = {}): AnyMiniMetadata => ({
  id: "substrate-native-polkadot",
  source: "substrate-native",
  chainId: "polkadot",
  specVersion: 1_000_000,
  version: "1.0.0",
  data: "0xabcd",
  extra: null,
  ...overrides,
})

// ─── Composite ─────────────────────────────────────────────────────

/** Creates a valid Chaindata with cross-referenced networks, tokens, and miniMetadatas */
export const makeChaindata = (overrides: Partial<Chaindata> = {}): Chaindata => ({
  networks: [makeDotNetwork(), makeEthNetwork(), makeSolNetwork()],
  tokens: [makeSubNativeToken(), makeEvmNativeToken(), makeSolNativeToken()],
  miniMetadatas: [makeMiniMetadata()],
  ...overrides,
})

/** Creates a valid CustomChaindata */
export const makeCustomChaindata = (overrides: Partial<CustomChaindata> = {}): CustomChaindata => ({
  tokens: [],
  ...overrides,
})

// ─── Invalid / Edge-case Variants ──────────────────────────────────

/** Network whose nativeTokenId doesn't match any token — fails ChaindataFileSchema check */
export const makeOrphanedNetwork = (): Network =>
  makeEthNetwork({
    id: "orphaned-chain",
    nativeTokenId: "does-not-exist",
    name: "Orphaned",
  })

/** Token with missing required field (no symbol) — fails TokenSchema */
export const makeInvalidToken = () => ({
  id: "bad-token",
  networkId: "1",
  type: "evm-native",
  platform: "ethereum",
  decimals: 18,
  // symbol is missing → invalid
})

/** Network with wrong platform rpcs (https on polkadot, needs wss) */
export const makeInvalidDotNetwork = () => ({
  ...makeDotNetwork({ id: "bad-dot" }),
  rpcs: ["https://wrong-protocol.example.com"],
})

/** Simulates persisted data from an older schema version with extra unknown fields */
export const makeLegacyPersistedData = () => ({
  networks: [
    {
      ...makeDotNetwork(),
      deprecatedField: "should-be-stripped-or-rejected",
    },
  ],
  tokens: [makeSubNativeToken()],
  miniMetadatas: [makeMiniMetadata()],
})

/** Simulates persisted data with a token type that doesn't exist in current schema */
export const makeUnknownTokenTypeData = () => ({
  networks: [makeEthNetwork()],
  tokens: [
    {
      id: "1-future-token",
      networkId: "1",
      type: "future-token-type",
      platform: "ethereum",
      decimals: 18,
      symbol: "FUT",
    },
  ],
  miniMetadatas: [],
})
