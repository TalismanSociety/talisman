# Public API Surface Analysis - Chaindata & Balances Packages

## Overview
Three packages with significant public APIs for managing blockchain chain data, token balances, and rates:
1. **@talismn/chaindata-provider** - Core data provider for chains and tokens
2. **@talismn/balances** - Balance management and aggregation
3. **@talismn/balances-react** - React hooks and atoms for balances state management

---

## 1. @talismn/chaindata-provider

**Location:** `/Volumes/dev/talisman/talisman-2/packages/chaindata-provider`  
**Entry Point:** `src/index.ts`  
**Exports:** Re-exports from submodules (chaindata, provider, utils, state)

### Main Class: ChaindataProvider

**File:** `src/provider/ChaindataProvider.ts`  
**Test Coverage:** ✅ YES - `ChaindataProvider.test.ts` (comprehensive)

#### Constructor & Options
```typescript
constructor(options?: ChaindataProviderOptions)
// Options:
// - persistedStorage?: ChaindataStorage | Promise<ChaindataStorage>
// - customChaindata$?: Observable<CustomChaindata> | CustomChaindata
// - dynamicTokens$?: ReplaySubject<Token[]>
```

#### Public Methods & Observables:

**Storage Management:**
- `get storage$(): Observable<ChaindataStorage>` - Subscribe to persist chaindata
- `async registerDynamicTokens(tokens: Token[]): Promise<void>` ✅ TESTED
  - *Complex logic:* Token schema validation, deduplication by ID, sorted output
  - *Use case:* SPL and dTAO token registration at runtime
  
- `async syncDynamicTokens(): Promise<void>`
  - *Complex logic:* Template-based token metadata synchronization (dTAO only)
  - *Note:* NO TEST COVERAGE for this method

**Network Methods** (with both Observable and Promise variants):
- `networks$: Observable<Network[]>`
- `getNetworks$(platform?: NetworkPlatform): Observable<NetworkOfPlatform<P>[]>`
- `getNetworkIds$(platform?: NetworkPlatform): Observable<NetworkId[]>`
- `getNetworksMapById$(platform?: NetworkPlatform): Observable<Record<NetworkId, Network>>`
- `getNetworksMapByGenesisHash$(): Observable<Record<0x${string}, DotNetwork>>`
- `getNetworkById$(networkId, platform?): Observable<Network | null>`
- `getNetworkByGenesisHash$(genesisHash): Observable<DotNetwork | null>`

**Token Methods** (with both Observable and Promise variants):
- `tokens$: Observable<Token[]>`
- `getTokens$<T>(type?: T): Observable<TokenOfType<T>[]>` - Type-filtered tokens
- `getTokenIds$(type?: TokenType): Observable<TokenId[]>`
- `getTokensMapById$<T>(type?: T): Observable<Record<TokenId, TokenOfType<T>>>`
- `getTokenById$<T>(id: TokenId, type?: T): Observable<TokenOfType<T> | null>`

**MiniMetadata Methods:**
- `miniMetadatas$: Observable<AnyMiniMetadata[]>`
- `getMiniMetadatas(): Promise<AnyMiniMetadata[]>`
- `miniMetadatasMapById$: Observable<Record<string, AnyMiniMetadata>>`
- `getMiniMetadataById$(id: string): Observable<AnyMiniMetadata | null>`
- `miniMetadataById(id: string): Promise<AnyMiniMetadata | null>`

#### Complex Logic Needing Tests:
1. **Token Type Filtering** - `getTokens$(type?)` uses internal `filterTokensByType()`
   - *Edge case:* Filtering with undefined type should return all
2. **Network Platform Filtering** - `getNetworks$(platform?)` 
   - *Edge case:* Filtering with undefined platform should return all
3. **Error Handling** - `withErrorReason()` wraps errors with context
   - *Potential issue:* Promise rejection handling in async methods
4. **Observable Caching** - Uses `shareReplay()` heavily
   - *Risk:* Memory leaks if subscriptions not properly unsubscribed

---

### Utility Functions: getBlockExplorerUrls

**File:** `src/getBlockExplorerUrls.ts`  
**Test Coverage:** ✅ YES - `getBlockExplorerUrls.test.ts` (134 lines)

#### Exported Functions:
```typescript
export const getBlockExplorerUrls(network: Network, query: BlockExplorerQuery): string[]
export const getBlockExplorerLabel(blockExplorerUrl: string): string
export const getGithubTokenLogoUrl(tokenId: KNOWN_TOKEN_ID): string
export const getGithubTokenLogoUrlByCoingeckoId(coingeckoId: string): string
```

#### Complex Logic:
1. **Query Path Resolution** - `getQueryPath()` 
   - *Complex:* Different explorer hosts have different URL path formats
   - *Platforms:* Polkadot.js, avail.so, statescan.io, taostats.io, subscan.io, etherscan, solscan, blockscout, moonscan
   - *Edge cases:*
     - polkadot.js uses hash fragments instead of paths
     - Block ID can be number, string, or bigint
     - Extrinsic requires special formatting (padStart for taostats)
   
2. **RPC URL Encoding** - URL parameter replacement and encoding
   - *Risk:* `encodeURIComponent()` for RPC URLs in query strings

3. **Explorer Host Detection** - `getExplorerHost()` 
   - *Logic:* Extracts last 2 parts of hostname or full hostname
   - *Edge case:* Handles polkadot.js.org specially

#### Test Coverage Gaps:
- ✅ getBlockExplorerUrls - COVERED
- ✅ getBlockExplorerLabel - COVERED  
- ❌ getGithubTokenLogoUrl - NOT TESTED
- ❌ getGithubTokenLogoUrlByCoingeckoId - NOT TESTED

---

### Chaindata Type System

**Location:** `src/chaindata/` 

#### Exported Types & Token ID Generators:
```typescript
// Token ID generators (validation + encoding logic)
export const evmErc20TokenId(networkId: string, contractAddress: 0x${string}): TokenId
export const evmNativeTokenId(networkId: NetworkId): TokenId
export const subAssetTokenId(networkId: NetworkId, assetId: string): TokenId
export const subNativeTokenId(networkId: NetworkId): TokenId
export const subPsp22TokenId(networkId: NetworkId, contractAddress: string): TokenId
export const subTokensTokenId(networkId: NetworkId, onChainId: string | number): TokenId
export const subDTaoTokenId(networkId: NetworkId, subnetId: number, hotkey?: string): TokenId

// Network type filters
export type NetworkOfPlatform<P extends NetworkPlatform> = Extract<Network, { platform: P }>
export type DotNetwork = NetworkOfPlatform<"polkadot">
export type EthToken = TokenOfPlatform<"ethereum">
export type SolToken = TokenOfPlatform<"solana">

// Type guards
export const isNetworkOfPlatform<P extends NetworkPlatform>(network, platform): boolean
export const isNetworkDot(network): boolean
export const isNetworkEth(network): boolean
export const isNetworkSol(network): boolean
export const isTokenOfType<T extends TokenType>(token, type): boolean
export const isTokenOfPlatform<P extends NetworkPlatform>(token, platform): boolean
export const isTokenDot(token): boolean
export const isTokenEth(token): boolean
export const isTokenSol(token): boolean
export const isTokenSubNative(token): boolean
export const isTokenSubAssets(token): boolean
export const isTokenSubDTao(token): boolean
export const isTokenSubForeignAssets(token): boolean
export const isTokenSubPsp22(token): boolean
export const isTokenSubTokens(token): boolean
export const isTokenSubHydration(token): boolean
export const isTokenEvmNative(token): boolean
export const isTokenEvmErc20(token): boolean
export const isTokenEvmUniswapV2(token): boolean
export const isTokenSolSpl(token): boolean
```

#### Complex Logic:
1. **TokenId Parsing** - `parseTokenId<T>(tokenId)`: TokenIdSpecs<T>`
   - Extracts networkId and sub-components from composite token IDs
   - Different formats per token type
   
2. **Native Token Type Identification**
   - Identifies native vs derived tokens per platform

#### Test Coverage for Token Functions:
- ❌ Most token ID generators - NOT DIRECTLY TESTED (tested through integration tests only)
- ❌ Type guard functions - NOT DIRECTLY TESTED (extensively used but no unit tests)

---

## 2. @talismn/balances

**Location:** `/Volumes/dev/talisman/talisman-2/packages/balances`  
**Entry Point:** `src/index.ts` → exports from `BalancesProvider.ts`, `modules/`, `types/`

### Main Class: BalancesProvider

**File:** `src/BalancesProvider.ts`  
**Test Coverage:** ✅ PARTIAL - tested through integration but not unit tests

#### Constructor
```typescript
constructor(
  chaindataProvider: ChaindataProvider,
  chainConnectors: ChainConnectors,
  storage?: BalancesStorage = DEFAULT_STORAGE
)
```

#### Public API:
```typescript
// Core observable for fetching balances
public getBalances$(addressesByTokenId: Record<TokenId, Address[]>): Observable<BalancesResult>
// One-shot promise version
public fetchBalances(addressesByTokenId: Record<TokenId, Address[]>): Promise<IBalance[]>

// Detect tokens dynamically
public getDetectedTokensId$(address: string): Observable<TokenId[]>

// Storage subscription
get storage$(): Observable<BalancesStorage>
```

**BalancesResult Type:**
```typescript
export type BalancesResult = {
  status: "initialising" | "live"
  balances: IBalance[]
  failedBalanceIds: string[]
}
```

#### Complex Logic (CRITICAL FOR TESTING):

1. **Address Validation & Cleanup** - `cleanupAddressesByTokenId$()`
   - Validates addresses per token type/platform
   - Handles Substrate, EVM, Solana address formats differently
   - ⚠️ NO UNIT TEST COVERAGE

2. **Network-based Balance Fetching** - `getNetworkBalances$()`
   - Routes by network platform (polkadot, ethereum, solana)
   - Handles multiple balance modules per network
   - ⚠️ Complex error recovery: returns cached "stale" balances on fetch failure

3. **Stale Balance Management** - `getBalancesResult()`
   - 30-second timer determines "initialising" vs "live" status
   - Failed balances marked as "stale" after 30s
   - *Risk:* Race condition if subscription completes before 30s timer fires

4. **Balance Module Filtering** - `getNetworkBalances$()`
   - Matches modules to network platform
   - Filters tokens by module type
   - Per-platform routing logic (Ethereum, Solana, Polkadot)
   - ⚠️ NO TEST COVERAGE for routing logic

#### Missing Test Coverage:
- ❌ `getBalances$()` - Address cleanup validation
- ❌ `getBalances$()` - Stale balance handling logic
- ❌ `getBalances$()` - Network routing for different platforms
- ❌ `fetchBalances()` - Promise wrapper
- ❌ `getDetectedTokensId$()`

---

### Balance Aggregation & Formatting Classes

**File:** `src/types/balances.ts`  
**Test Coverage:** ✅ YES - `balances.test.ts` (434 lines), `balance-class.test.ts` (726 lines)

#### Main Collection Class: Balances

```typescript
export class Balances {
  // Constructor with multiple input formats
  constructor(
    balances: Balances | BalanceJsonList | Balance[] | IBalance[] | BalanceJson[] | Balance,
    hydrate?: HydrateDb
  )

  // Conversion & storage
  toJSON(): BalanceJsonList
  hydrate(sources: HydrateDb): void
  get storage$(): Observable<BalancesStorage>

  // Collection access
  get each(): Balance[]          // All balances
  get sorted(): Balance[]        // Deprecated alias for each
  get count(): number            // Count of balances
  [Symbol.iterator]()            // Iterable protocol

  // Filtering & searching (return new Balances)
  get(id: string): Balance | null
  find(query: BalanceSearchQuery | BalanceSearchQuery[]): Balances
  filterMirrorTokens(): Balances
  filterNonZeroFiat(type: BalanceType, currency: TokenRateCurrency): Balances

  // Collection mutations (return new Balances)
  add(balances: Balances | Balance): Balances
  remove(ids: string[] | string): Balances

  // Aggregation
  get sum(): SumBalancesFormatter
    // Use: balances.sum.fiat('usd').transferable
}
```

**BalanceSearchQuery Type** - Flexible query format:
```typescript
type BalanceSearchQuery = 
  | Partial<NonFunctionProperties<Balance>>  // Property matches
  | ((balance: Balance) => boolean)          // Custom predicate
```

#### Individual Balance Class: Balance

```typescript
export class Balance {
  constructor(storage: BalanceJson | IBalance, hydrate?: HydrateDb)
  toJSON(): BalanceJson
  isSource(source: BalanceSource): boolean
  hydrate(hydrate?: HydrateDb): void

  // Identity properties
  get id(): string                    // address::tokenId
  get source(): string                // Balance module source
  get status(): BalanceStatus         // "live" | "cache" | "stale"
  get address(): Address
  get tokenId(): TokenId
  get networkId(): NetworkId

  // Hydrated data access
  get network(): Network | null       // Requires hydrate()
  get token(): Token | null           // Requires hydrate()
  get decimals(): number | undefined
  get rates(): TokenRates | null

  // Amount accessors (by type/status)
  get total(): BalanceValueGetter      // Total amount (all values)
  get free(): BalanceValueGetter       // Free/available (substrate)
  get reserved(): BalanceValueGetter   // Reserved amount
  get locked(): BalanceValueGetter     // Locked (largest or array)
  get locks(): LockedAmount[]          // All lock entries
  get nompools(): AmountWithLabel[]    // Nomination pools
  get extra(): ExtraAmount[]           // Extra amounts
  get frozen(): BalanceValueGetter     // Frozen amount
  get transferable(): BalanceValueGetter // Transferable (calculated)
  get unavailable(): BalanceValueGetter  // Unavailable
  get feePayable(): BalanceValueGetter   // Available for fees
}
```

#### Value Accessor: BalanceValueGetter

```typescript
export class BalanceValueGetter {
  get planck(): BalanceFormatter       // In smallest unit
  get tokens(): BalanceFormatter       // In token units (decimals applied)
}
```

#### Formatter Classes:

```typescript
export class BalanceFormatter {
  get planck(): bigint
  get tokens(): BigNumber
  fiat(currency: TokenRateCurrency): number | null

  // Human-readable formats
  toLocaleString(): string
  toString(): string
}

export class PlanckSumBalancesFormatter {
  get total(): BalanceFormatter
  get free(): BalanceFormatter
  get reserved(): BalanceFormatter
  get locked(): BalanceFormatter
  get frozen(): BalanceFormatter
  get transferable(): BalanceFormatter
  get unavailable(): BalanceFormatter
  get feePayable(): BalanceFormatter
}

export class FiatSumBalancesFormatter {
  get total(): number | null
  get free(): number | null
  // ... all types
}

export class SumBalancesFormatter {
  planck(currency?): PlanckSumBalancesFormatter
  fiat(currency: TokenRateCurrency): FiatSumBalancesFormatter
  // Use: balances.sum.fiat('usd').transferable
}
```

#### Utility Functions:

```typescript
export const getBalanceId(balance: Pick<IBalance, "address" | "tokenId">): string

export function excludeFromTransferableAmount(
  locks: Amount | FormattedAmount<LockedAmount<string>, string> | Array<...>
): bigint

export function excludeFromFeePayableLocks(
  locks: Amount | LockedAmount<string> | Array<LockedAmount<string>>
): Array<LockedAmount<string>>

export function includeInTotalExtraAmount(
  extra?: FormattedAmount<ExtraAmount<string>, string> | Array<...>
): bigint

export const filterMirrorTokens(balance: Balance, _i: number, balances: Balance[]): boolean
```

#### Complex Logic:
1. **Transferable Calculation** - Excludes locks/reserves
   - Different per network platform (Substrate has legacy mode)
   - 🔴 CRITICAL: `useLegacyTransferableCalculation` flag affects all calculations

2. **Fee Payable Logic** - `excludeFromFeePayable`
   - Some locked amounts can be used for fees
   - Filtered by `excludeFromFeePayable` flag

3. **Mirror Token Filtering** - `filterMirrorTokens()`
   - Removes balances where token.mirrorOf points to another token in collection
   - Use case: Multiple representations of same asset

4. **Formatting Arithmetic** - `BalanceFormatter`
   - Handles big number math with decimals
   - Fiat conversion using rates
   - ⚠️ Handles null rates gracefully but returns null for fiat

#### Test Coverage Summary:
- ✅ `Balances.find()` - TESTED
- ✅ `Balances.filterMirrorTokens()` - TESTED
- ✅ `Balances.add()` / `Balances.remove()` - TESTED
- ✅ `Balance` properties and formatting - TESTED (726 lines)
- ✅ `BalanceFormatter` arithmetic - TESTED
- ❌ `BalancesProvider.getBalances$()` - NO UNIT TESTS (integration only)
- ❌ `Balances.filterNonZeroFiat()` - NOT TESTED
- ❌ `excludeFromFeePayableLocks()` - NOT TESTED
- ❌ `includeInTotalExtraAmount()` - NOT TESTED

---

### Balance Types

**File:** `src/types/balancetypes.ts`

```typescript
export type IBalance = {
  source: string                      // Module that fetched it
  status: BalanceStatus               // "live" | "cache" | "stale"
  address: Address
  tokenId: TokenId
  networkId: NetworkId
  useLegacyTransferableCalculation?: boolean
  
  // Either simple value OR complex values (discriminated)
  value?: Amount                      // Simple token balance
  values?: Array<AmountWithLabel<string>>
}

export type BalanceStatus = "live" | "cache" | "stale"
export type BalanceStatusTypes = "free" | "reserved" | "locked" | "extra" | "nompool"
export type Amount = string            // Always stringified for precision

export type AmountWithLabel<TLabel extends string> = {
  type: BalanceStatusTypes
  source?: string
  label: TLabel
  amount: Amount
  meta?: unknown
}

export type LockedAmount<TLabel extends string> = AmountWithLabel<TLabel> & {
  includeInTransferable?: boolean      // Skip this lock in transferable calc
  excludeFromFeePayable?: boolean      // Exclude from fee-payable calc
}

export type ExtraAmount<TLabel extends string> = AmountWithLabel<TLabel> & {
  includeInTotal?: boolean             // Include in total calculation
}

export function getValueId(amount: AmountWithLabel<string>): string
  // Returns: `${label}::${type}::${source}::${poolId || ""}`
  // Purpose: Unique identifier for amount within a balance
```

#### Test Coverage:
- ✅ `getValueId()` - TESTED in `balancetypes.test.ts`
- ✅ Type schemas - TESTED

---

### Balance Modules Interface

**File:** `src/types/IBalanceModule.ts`

```typescript
export interface IBalanceModule<
  T extends TokenType = TokenType,
  P extends NetworkPlatform = NetworkPlatform
> {
  readonly type: T
  readonly platform: P
  
  getBalances(
    chainConnector: PlatformConnector<P>,
    tokensWithAddresses: TokensWithAddresses,
    options?: BalanceModuleOptions
  ): Promise<FetchBalanceResults>
}

export type FetchBalanceResults = {
  balances: IBalance[]
  errors?: FetchBalanceErrors
}

export type FetchBalanceErrors = Array<{
  tokenId: TokenId
  address: Address
  error: Error
}>

export type TokensWithAddresses = Array<[Token, Address[]]>
```

#### Available Modules:
- `SubNativeBalanceModule` - Substrate native tokens
- `SubAssetsBalanceModule` - Substrate Assets pallet
- `SubDTaoBalanceModule` - Bittensor dTAO tokens (complex logic)
- `SubHydrationBalanceModule` - Hydration network
- `SubForeignAssetsBalanceModule` - Substrate foreign assets
- `SubPsp22BalanceModule` - Substrate PSP-22 contracts
- `SubTokensBalanceModule` - Substrate Tokens pallet
- `EvmErc20BalanceModule` - EVM ERC-20 tokens
- `EvmUniswapV2BalanceModule` - Uniswap V2 LP tokens (complex)
- `EvmNativeBalanceModule` - EVM native tokens
- `SolNativeBalanceModule` - Solana native tokens
- `SolSplBalanceModule` - Solana SPL tokens

---

## 3. @talismn/balances-react

**Location:** `/Volumes/dev/talisman/talisman-2/packages/balances-react`  
**Entry Point:** `src/index.tsx`  
**Architecture:** Jotai atoms + React hooks

### Main Component: BalancesProvider

**File:** `src/index.tsx` (component, not class)

```typescript
export type BalancesConfig = {
  coinsApiUrl?: string
  withTestnets?: boolean
  enabledChains?: string[]        // Genesis hashes for filtering
  enabledTokens?: TokenId[]       // Token IDs for filtering
  children?: ReactNode
}

export const BalancesProvider = ({
  coinsApiUrl,
  withTestnets,
  enabledChains,
  enabledTokens,
  children
}: BalancesConfig) => JSX.Element
```

#### Complex Logic:
1. **Chain & Token Filtering** - Intersection of enabled lists
   - ⚠️ Allowlist only - not a blocklist
   - Does NOT enable unsupported chains/tokens
   
2. **Testnet Enablement** - `withTestnets` flag
   - Global switch for all testnet chains

#### Test Coverage:
- ✅ Basic rendering - `index.test.ts`
- ❌ Config validation - NOT TESTED
- ❌ Filter logic - NOT TESTED

---

### Jotai Atoms

**Locations:** `src/atoms/`

#### Configuration Atoms:
```typescript
export const coinsApiConfigAtom = atom<CoinsApiConfig>(DEFAULT_COINSAPI_CONFIG)
  // Set via: set(coinsApiConfigAtom, { apiUrl: "..." })

export const enableTestnetsAtom = atom<boolean>(false)
export const enabledChainsAtom = atom<DotNetworkId[] | undefined>(undefined)
export const enabledTokensAtom = atom<TokenId[] | undefined>(undefined)
```

#### Data Atoms:
```typescript
export const chaindataProviderAtom = atom<ChaindataProvider>(...)  // Singleton
export const balancesProviderAtom = atom<BalancesProvider>(...)    // Singleton
export const chainConnectorsAtom = atom<ChainConnectors>(...)      // Singleton

export const chaindataAtom = atomWithObservable((get) => {         // Observable-backed
  // Returns: Chaindata observable with filtering applied
})

export const tokensAtom = atom(async (get) => Promise<Token[]>)
export const networksAtom = atom(async (get) => Promise<Network[]>)

export const balancesAtom = atom(async (get) => {
  // Returns: Balances instance
  // Subscribes to: balancesProvider + hydration data
  // Complex: Async initialization with side effects
})
```

**Hydration Data:**
```typescript
export type HydrateDb = Partial<{
  networks: NetworkList
  tokens: TokenList
  tokenRates: TokenRatesList
}>
```

#### Test Coverage:
- ❌ Most atoms - NOT TESTED
- ✅ balancesAtom setup - Tested in index.test.ts (basic)

---

### React Hooks

**File:** `src/hooks/`

#### Main Hooks:

```typescript
export const useSetBalancesAddresses = (addresses: string[]): void
  // Sets addresses globally; memoized for reference equality

export const useBalances = (): Promise<Balances>
  // Main hook to get balances
  // Returns async Balances instance (wrapped in Suspense)

export const useBalancesStatus = (balances: Balances): BalancesStatus
  // Computes: "live" | "fetching" | "stale"
  // Checks: balance.status and returns first matching state

export const getStaleChains = (balances: Balances): string[]
  // Extracts chain names from stale balances
```

**BalancesStatus Type:**
```typescript
export type BalancesStatus = 
  | { status: "live" }
  | { status: "fetching" }
  | { status: "stale"; staleChains: string[] }
```

#### Other Hooks:
```typescript
export const useChaindata = (): Promise<Chaindata>
export const useChainConnectors = (): ChainConnectors
export const useTokenRates = (): Promise<TokenRatesList>
```

#### Test Coverage:
- ❌ All hooks - NOT TESTED (requires Jotai provider setup)

---

## Test Coverage Summary Table

| Package | Module | Class/Function | Coverage | Priority |
|---------|--------|-----------------|----------|----------|
| chaindata-provider | provider | ChaindataProvider.registerDynamicTokens() | ✅ YES | - |
| chaindata-provider | provider | ChaindataProvider.syncDynamicTokens() | ❌ NO | 🔴 HIGH |
| chaindata-provider | provider | ChaindataProvider.getNetworks$() | ✅ (integration) | - |
| chaindata-provider | util | parseTokenId() | ❌ NO | 🔴 HIGH |
| chaindata-provider | util | Token ID generators (all 7) | ❌ NO | 🟡 MEDIUM |
| chaindata-provider | util | Type guards (all 20+) | ❌ NO | 🟡 MEDIUM |
| chaindata-provider | util | getBlockExplorerUrls() | ✅ YES | - |
| chaindata-provider | util | getBlockExplorerLabel() | ✅ YES | - |
| chaindata-provider | util | getGithubTokenLogoUrl() | ❌ NO | 🟢 LOW |
| balances | BalancesProvider | getBalances$() | ❌ NO | 🔴 HIGH |
| balances | BalancesProvider | fetchBalances() | ❌ NO | 🔴 HIGH |
| balances | BalancesProvider | getDetectedTokensId$() | ❌ NO | 🔴 HIGH |
| balances | Balances | Collection methods | ✅ YES | - |
| balances | Balance | Formatting & access | ✅ YES | - |
| balances | Utilities | excludeFromFeePayableLocks() | ❌ NO | 🟡 MEDIUM |
| balances | Utilities | includeInTotalExtraAmount() | ❌ NO | 🟡 MEDIUM |
| balances-react | BalancesProvider | Component | ✅ (basic) | - |
| balances-react | Hooks | useBalances() | ❌ NO | 🟡 MEDIUM |
| balances-react | Hooks | useBalancesStatus() | ❌ NO | 🟡 MEDIUM |
| balances-react | Atoms | Configuration atoms | ❌ NO | 🟢 LOW |

---

## Critical Missing Test Coverage

### 🔴 HIGH PRIORITY

1. **ChaindataProvider.syncDynamicTokens()** 
   - Complex template-based metadata sync logic
   - Only handles dTAO currently
   - Risk: Breaking changes to token metadata

2. **BalancesProvider.getBalances$() Address Cleanup**
   - Complex validation per token type/platform
   - Substrate/EVM/Solana use different address formats
   - Risk: Silent rejection of valid addresses

3. **parseTokenId() Type Safety**
   - Parses composite IDs into components
   - Different formats per token type
   - Risk: Parsing errors on unknown token types

4. **getBlockExplorerUrls() Edge Cases**
   - Platform-specific URL formatting
   - Block ID can be string/number/bigint
   - Extrinsic padding (taostats-specific)
   - Risk: 404s or malformed explorer links

### 🟡 MEDIUM PRIORITY

1. **Balance Amount Calculations**
   - `excludeFromFeePayableLocks()` - Flag-based filtering
   - `includeInTotalExtraAmount()` - Conditional sum
   - Risk: Incorrect balance calculations

2. **Token Type Guards** (20+ functions)
   - `isTokenSubNative()`, `isTokenEvmErc20()`, etc.
   - Used extensively but no direct tests
   - Risk: Type safety regressions

3. **useBalancesStatus() Logic**
   - Status determination based on balance.status values
   - Returns first matching state (live → fetching → stale)
   - Risk: Incorrect status reporting

4. **Mirror Token Filtering**
   - Complex set-based logic
   - Needs token ID lookups
   - Risk: Duplicate balances for mirrored tokens

---

## Key Data Flow for Regression Testing

### Balance Fetching Pipeline
```
BalancesProvider.getBalances$(addressesByTokenId)
  ↓
  cleanupAddressesByTokenId$(validation)
  ↓
  Split by network (parseTokenId for networkId)
  ↓
  Filter modules by network.platform
  ↓
  Route to platform-specific handler:
    - Polkadot: getPolkadotNetworkModuleBalances$()
    - Ethereum: getEthereumNetworkModuleBalances$()
    - Solana: getSolanaNetworkModuleBalances$()
  ↓
  Wait 30s or for all modules to return
  ↓
  Emit BalancesResult { status, balances[], failedBalanceIds[] }
```

### Balance Display Pipeline
```
IBalance JSON → Balance object (with hydration)
  ↓
  Balance.total, Balance.free, etc. (getter chains)
  ↓
  BalanceValueGetter (raw or formatted)
  ↓
  BalanceFormatter (with rates if available)
  ↓
  .planck (bigint), .tokens (BigNumber), or .fiat(currency)
```

---

## Configuration & Edge Cases

### Testnet Handling
- `enableTestnets` flag at BalancesProvider level
- Filters at chaindata level
- Both must be set correctly for testnet balances

### Token/Chain Filtering
- `enabledChains`: Genesis hashes only (Polkadot)
- `enabledTokens`: Token IDs (any platform)
- INTERSECTION applied if both set
- Allowlist only - does not enable unsupported items

### Dynamic Token Registration
- SPL tokens: Detected at runtime, registered dynamically
- dTAO tokens: Registered + metadata synced
- Uses schema validation (Zod)
- Deduplication by tokenId + sorted output

### Balance Status Lifecycle
```
"cache" (from storage) → "live" (subscribed & updated) → "stale" (30s+ or error)
```
- After 30s with any initializing balance, status becomes "live"
- If error occurs, cached balance returned as "stale"
- Can recover back to "live" if subscription recovers

---

## Recommendations

### For Regression Testing
1. Focus on **balance calculation logic** - highest risk
2. Add unit tests for **token ID parsing** - used everywhere
3. Test **platform-specific routing** - most error-prone
4. Cover **edge cases** in block explorer URL generation

### For Integration Testing
1. Test balance fetching with **real module data**
2. Verify **mirror token filtering** with actual token sets
3. Test **chain/token filtering** combinations
4. Verify **stale balance recovery** behavior

### For Type Safety
1. Add tests for all **type guard functions**
2. Validate **token type discriminators**
3. Test **platform-specific balance amounts**

