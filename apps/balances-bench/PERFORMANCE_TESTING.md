# Performance Testing Guide for subscribeBalances Refactor

## Current Situation

**❌ The current `dev:bittensor` test is NOT suitable for measuring subscribeBalances performance**

The current test (`pnpm run --filter balances-bench dev:bittensor`) only tests:

- `fetchBalances()` - a one-time promise-based call
- Does NOT test `subscribeBalances()` - the Observable-based subscription pattern

The performance bottleneck we're fixing is in `subscribeBalances`, which uses a polling pattern with blocking `await` calls.

## What We Need to Measure

To properly measure the impact of converting `subscribeBalances` from blocking awaits to RxJS Observables, we need to measure:

1. **Time to first emission** - How long until the first balance data arrives
2. **Time between emissions** - Poll interval consistency
3. **Blocking time** - How long the thread is blocked during await
4. **Total test time** - Overall subscription performance
5. **Cancellation responsiveness** - How quickly unsubscribe works

## Recommended Testing Approach

### Option 1: Create a Dedicated Subscription Test (Recommended)

I've created `testSubscribeBalances.ts` utility that:

- Sets up a subscription using `subscribeBalances()`
- Measures multiple poll iterations
- Tracks blocking time and emission intervals
- Provides detailed performance metrics

**To use it:**

1. Integrate it with the existing test setup
2. Run before and after the refactor
3. Compare metrics

### Option 2: Use BalancesProvider (More Realistic)

Test through `BalancesProvider.getBalances$()` which internally uses `subscribeBalances`:

- More realistic usage pattern
- Measures the full stack performance
- Harder to isolate subscribeBalances-specific improvements

### Option 3: Micro-benchmark subscribeBalances Directly

Create a simple test that:

- Calls `mod.subscribeBalances()` directly
- Measures time to first emission
- Measures multiple emissions
- Tests cancellation

## Quick Test Implementation

Since the full integration would require refactoring `testNetworkDot`, here's a simpler approach:

**Create a minimal test file that reuses setup from testNetworkDot:**

```typescript
// bittensor-subscribe-performance.ts
// 1. Run testNetworkDot to get tokens and metadata
// 2. Then run subscribeBalances test
// 3. Compare before/after metrics
```

## Metrics to Compare

When comparing before/after:

| Metric                        | Before (Blocking) | After (Observable) | Expected Improvement              |
| ----------------------------- | ----------------- | ------------------ | --------------------------------- |
| Time to first emission        | X ms              | Y ms               | Similar (network bound)           |
| Blocking percentage           | X%                | Y%                 | **Should decrease significantly** |
| Emission interval consistency | Variable          | More consistent    | Better                            |
| Cancellation time             | Slow              | Fast               | **Much faster**                   |
| Thread blocking               | High              | Low                | **Significant reduction**         |

## Key Insight

The main difference won't be in total time (network calls are still network calls), but in:

- **Thread blocking**: Observable pattern allows other work during network waits
- **Cancellation**: Observable unsubscription is instant vs waiting for async functions
- **Error handling**: Observable errors don't break the stream

## Recommendation

For the Phase 1 refactor (subscribeBalances), you can:

1. **Start with a simple manual test:**

   - Make the refactor
   - Run the existing test to ensure it still works
   - Manually verify no regressions

2. **Add performance instrumentation:**

   - Add timing logs in subscribeBalances
   - Compare console output before/after
   - Look for reduced blocking time

3. **Use the mobile app as the real test:**

   - The UI freeze is the actual problem we're solving
   - Test in the mobile app before/after
   - Measure UI responsiveness

4. **Create proper benchmark later:**
   - After verifying the refactor works
   - Add comprehensive benchmarks
   - Use for regression testing

## Next Steps

1. ✅ Implement the Observable refactor
2. ✅ Run existing tests to ensure no breakage
3. ✅ Test in mobile app to verify UI freeze improvement
4. ⏭️ Add comprehensive benchmarks for future testing
