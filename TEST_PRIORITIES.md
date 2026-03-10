# Regression Test Priorities - Quick Reference

## 🔴 CRITICAL PATH TESTS (Must Have First)

### 1. Token ID Parsing & Generation
**File:** `packages/chaindata-provider/src/chaindata/utils.ts`

```typescript
// MISSING: parseTokenId() tests
export const parseTokenId = <T extends TokenType>(tokenId: TokenId): TokenIdSpecs<T>

// MISSING: All 7 token ID generators
export const evmErc20TokenId(networkId, contractAddress)
export const evmNativeTokenId(networkId)
export const subAssetTokenId(networkId, assetId)
export const subNativeTokenId(networkId)
export const subPsp22TokenId(networkId, contractAddress)
export const subTokensTokenId(networkId, onChainId)
export const subDTaoTokenId(networkId, subnetId, hotkey?)
```

**Test Scenarios:**
- [ ] Parse each token type (7 types)
- [ ] Parse with invalid formats (expect errors)
- [ ] Round-trip: generate → parse → verify
- [ ] Edge cases: empty strings, special characters
- [ ] Extract networkId correctly for each type

**Risk Level:** 🔴 CRITICAL
**Impact:** Breaks balance fetching if token IDs can't be parsed

---

### 2. Balance Fetching Pipeline
**File:** `packages/balances/src/BalancesProvider.ts`

```typescript
// MISSING: getBalances$() tests
public getBalances$(addressesByTokenId: Record<TokenId, Address[]>): Observable<BalancesResult>

// MISSING: address cleanup tests  
private cleanupAddressesByTokenId$(addressesByTokenId): Observable<...>
```

**Test Scenarios:**
- [ ] Valid Substrate addresses per token type
- [ ] Valid EVM addresses per token type
- [ ] Valid Solana addresses
- [ ] Invalid addresses are rejected
- [ ] Network routing via token ID
- [ ] Module filtering by platform
- [ ] Stale balance handling after 30s timeout
- [ ] Error recovery with cached balances
- [ ] Empty address arrays
- [ ] Mixed valid + invalid addresses

**Risk Level:** 🔴 CRITICAL
**Impact:** Main user-facing feature - balance display

---

### 3. Block Explorer URL Generation
**File:** `packages/chaindata-provider/src/getBlockExplorerUrls.ts`

```typescript
// ALREADY TESTED but needs edge cases
export const getBlockExplorerUrls(network: Network, query: BlockExplorerQuery): string[]

// MISSING: Logo URL tests
export const getGithubTokenLogoUrl(tokenId)
export const getGithubTokenLogoUrlByCoingeckoId(coingeckoId)
```

**Test Scenarios:**
- [ ] All 8 explorer hosts (polkadot.js, statescan, subscan, etherscan, solscan, blockscout, moonscan, avail.so)
- [ ] All query types (address, account, transaction, block, extrinsic, extrinsic-unknown)
- [ ] Block ID as number/string/bigint
- [ ] RPC URL with special characters (test encoding)
- [ ] Missing RPC URL for polkadot.js (should return null)
- [ ] Logo URLs return valid 404-resistant URLs

**Risk Level:** 🔴 CRITICAL
**Impact:** User explorer navigation, token display

---

## 🟡 HIGH PRIORITY TESTS (Week 2)

### 4. Balance Amount Calculations
**File:** `packages/balances/src/types/balances.ts`

```typescript
// MISSING: Lock filtering tests
export function excludeFromTransferableAmount(locks)
export function excludeFromFeePayableLocks(locks)
export function includeInTotalExtraAmount(extra)

// PARTIALLY TESTED: Balance getters
Balance.free, Balance.reserved, Balance.locked, Balance.transferable
```

**Test Scenarios:**
- [ ] excludeFromTransferableAmount with multiple locks
- [ ] excludeFromFeePayableLocks filtering by flag
- [ ] includeInTotalExtraAmount conditional sum
- [ ] Lock ordering (max vs array)
- [ ] Legacy vs modern transferable calculation
- [ ] Zero amounts handling
- [ ] Mixed currency types

**Risk Level:** 🟡 HIGH
**Impact:** Incorrect transferable amounts for users

---

### 5. Type Guard Functions (20+ functions)
**File:** `packages/chaindata-provider/src/chaindata/utils.ts`

```typescript
// MISSING ALL: Type guard tests
export const isTokenOfType<T>(token, type)
export const isNetworkOfPlatform<P>(network, platform)
export const isTokenDot(token)
export const isTokenEth(token)
export const isTokenSol(token)
export const isTokenSubNative(token)
export const isTokenEvmErc20(token)
// ... + 13 more
```

**Test Scenarios:**
- [ ] Each guard with matching type (expect true)
- [ ] Each guard with non-matching type (expect false)
- [ ] null/undefined inputs (expect false)
- [ ] Malformed objects (expect false)
- [ ] Platform-specific checks
- [ ] Token type discriminators

**Risk Level:** 🟡 HIGH
**Impact:** Wrong module selection, silent failures

---

### 6. Dynamic Token Registration
**File:** `packages/chaindata-provider/src/provider/ChaindataProvider.ts`

```typescript
// PARTIALLY TESTED
public async registerDynamicTokens(tokens: Token[]): Promise<void>

// MISSING: Metadata sync tests
public async syncDynamicTokens(): Promise<void>
```

**Test Scenarios:**
- [ ] Register SPL tokens
- [ ] Register dTAO tokens
- [ ] Deduplication by tokenId
- [ ] Sorted output verification
- [ ] Schema validation errors
- [ ] Sync template-based metadata (dTAO)
- [ ] Skip if template not found
- [ ] No-op if no updates needed

**Risk Level:** 🟡 HIGH
**Impact:** Dynamic token support (SPL, dTAO)

---

## 🟢 MEDIUM PRIORITY TESTS (Week 3)

### 7. React Hooks
**File:** `packages/balances-react/src/hooks/`

```typescript
// MISSING: Hook tests
export const useBalances(): Promise<Balances>
export const useBalancesStatus(balances): BalancesStatus
export const useSetBalancesAddresses(addresses)
export const getStaleChains(balances): string[]
```

**Test Scenarios:**
- [ ] useBalances returns Balances instance
- [ ] useBalancesStatus state determination (live/fetching/stale)
- [ ] getStaleChains extracts chain names
- [ ] useSetBalancesAddresses with reference equality
- [ ] Configuration filtering (enabledChains, enabledTokens)
- [ ] Testnet flag behavior

**Risk Level:** 🟢 MEDIUM
**Impact:** React integration, configuration

---

### 8. Chaindata Filtering
**File:** `packages/chaindata-provider/src/provider/ChaindataProvider.ts`

```typescript
// NEEDS EDGE CASE TESTS
public getNetworks$<P>(platform?: P)
public getTokens$<T>(type?: T)
public getNetworkById$<P>(networkId, platform?)
public getTokenById$<T>(id, type?)
```

**Test Scenarios:**
- [ ] Filtering with undefined (should return all)
- [ ] Filtering with specific platform
- [ ] Filtering with specific token type
- [ ] Multiple simultaneous filters
- [ ] Empty results
- [ ] Non-existent IDs (expect null)

**Risk Level:** 🟢 MEDIUM
**Impact:** Data filtering, edge cases

---

## Quick Test Count

| Component | Estimated Tests | Complexity |
|-----------|-----------------|-----------|
| parseTokenId() | 40 | High |
| Token ID generators (7) | 35 | Medium |
| BalancesProvider.getBalances$() | 50 | High |
| Block explorer URLs | 50 | High |
| Type guards (20+) | 60 | Medium |
| Balance calculations | 30 | Medium |
| Dynamic tokens | 20 | Medium |
| React hooks | 25 | Medium |
| Filtering edge cases | 30 | Low |
| **TOTAL** | **~340** | - |

**Estimated Lines of Code:** 1,500-2,000 (tests + mocks + fixtures)

---

## Files to Create Tests In

```
packages/chaindata-provider/src/
  ├─ chaindata/utils.test.ts (NEW - parseTokenId, type guards)
  ├─ chaindata/tokens/tokenGenerators.test.ts (NEW)
  └─ provider/ChaindataProvider.test.ts (EXTEND - add dynamic token tests)

packages/balances/src/
  ├─ BalancesProvider.test.ts (NEW - getBalances$ pipeline)
  ├─ types/balanceUtilities.test.ts (NEW - excludeFrom*, includeIn*)
  └─ types/balances.test.ts (EXTEND - edge cases)

packages/balances-react/src/
  ├─ hooks/useBalances.test.tsx (NEW)
  ├─ atoms/atoms.test.ts (NEW)
  └─ index.test.ts (EXTEND)
```

---

## Dependencies & Mocks Needed

1. **Mock ChaindataProvider** - For balance tests
2. **Mock ChainConnectors** - For platform-specific tests
3. **Test Fixtures** - Sample tokens, networks, addresses
4. **RxJS TestScheduler** - For observable testing
5. **Jotai Provider** - For React hook tests
6. **Vitest setup** - Async/await support

---

## Success Criteria

- [ ] 80% coverage of public API
- [ ] All critical paths covered
- [ ] All edge cases documented
- [ ] Type safety verified
- [ ] Error handling tested
- [ ] Integration scenarios working
