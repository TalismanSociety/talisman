import { monitorEventLoopDelay } from "node:perf_hooks"
import { BALANCE_MODULES } from "@talismn/balances"
import { ChainConnectorEthStub, type IChainConnectorEth } from "@talismn/chain-connectors"
import type { EthNetwork, Token, TokenType } from "@talismn/chaindata-provider"
import { log } from "extension-shared"

const TEST_ADDRESS_ETH = "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67"
const TEST_ADDRESS_ETH2 = "0x1367e59070Ec898867C35c0600C0ec7483c96AF9"

export type EthNetworkConfig = Pick<EthNetwork, "id" | "rpcs" | "contracts"> & {
  nativeCurrency?: Partial<EthNetwork["nativeCurrency"]>
  tokens: Partial<Record<TokenType, unknown[]>>
}

type SubscribeBalancesTestOptions = {
  module?: TokenType
  /**
   * Duration of the test in milliseconds
   */
  testDuration?: number
  /**
   * Interval for the monitoring loop in milliseconds (should be small, e.g., 5ms)
   */
  monitoringInterval?: number
  /**
   * Timeout for initial subscription setup
   */
  setupTimeout?: number
  /**
   * When true, only runs the monitoring loop (no balance subscription).
   * Use this as a baseline to compare against subscription runs.
   */
  monitoringOnly?: boolean
}

/**
 * Tests whether subscribeBalances blocks the thread by measuring delays
 * in an async loop that runs concurrently with the subscription.
 *
 * The test runs a monitoring loop that attempts to execute every 5ms (default).
 * If the subscription is blocking the thread with synchronous I/O, we expect
 * to see massive delays in the monitoring loop execution.
 */
export const testSubscribeBalancesEth = async (
  network: EthNetworkConfig,
  tokens: Token[],
  options?: SubscribeBalancesTestOptions
) => {
  const opts: Required<SubscribeBalancesTestOptions> = {
    module: options?.module || "evm-erc20",
    testDuration: options?.testDuration ?? 30000, // 30 seconds
    monitoringInterval: options?.monitoringInterval ?? 5, // 5ms
    setupTimeout: options?.setupTimeout ?? 30000,
    monitoringOnly: options?.monitoringOnly ?? false,
  }

  const connector = new ChainConnectorEthStub(network as unknown as EthNetwork)

  const mod = BALANCE_MODULES.find((m) => m.type === opts.module && m.platform === "ethereum")
  if (!mod) {
    throw new Error(`Module ${opts.module} not found`)
  }

  log.log()
  log.log("=".repeat(80))
  log.log(`Thread Blocking Test: subscribeBalances for ${opts.module}`)
  log.log("=".repeat(80))
  log.log()

  const tokensWithAddresses: Array<[Token, string[]]> = tokens.map((token) => [
    token,
    [TEST_ADDRESS_ETH, TEST_ADDRESS_ETH2],
  ])

  log.log(`Test Configuration:`)
  log.log(`  - Module: ${opts.module}`)
  log.log(`  - Test Duration: ${opts.testDuration}ms`)
  log.log(`  - Monitoring Interval: ${opts.monitoringInterval}ms`)
  log.log(`  - Monitoring only: ${opts.monitoringOnly}`)
  log.log(`  - Tokens: ${tokens.length}, Addresses: 2`)
  log.log()

  // Metrics for monitoring loop
  const monitoringMetrics = {
    expectedTicks: Math.floor(opts.testDuration / opts.monitoringInterval),
    actualTicks: 0,
    delays: [] as number[], // Actual delay for each tick
    maxDelay: 0,
    minDelay: Infinity,
    totalDelay: 0,
    ticksWithSignificantDelay: 0, // Ticks with delay > 2x expected interval
  }

  // Metrics for subscription
  const subscriptionMetrics = {
    emissions: 0,
    firstEmissionTime: 0,
    errors: [] as Error[],
  }

  const testStartTime = performance.now()

  // Capture mod in const for use in async functions (TypeScript control flow)
  const balanceModule = mod

  // Node-level event loop delay histogram (direct measure of event-loop stalls)
  // Resolution is in nanoseconds; we report values in milliseconds.
  const elDelay = monitorEventLoopDelay({ resolution: 10 })
  elDelay.enable()

  // Start the monitoring loop
  log.log("Starting monitoring loop...")
  const monitoringPromise = (async () => {
    let nextScheduledTime = testStartTime + opts.monitoringInterval

    while (true) {
      const currentTime = performance.now()
      const elapsed = currentTime - testStartTime

      // Stop if we've exceeded the test duration
      if (elapsed >= opts.testDuration) {
        break
      }

      // Record when this iteration is scheduled to execute
      const scheduledTime = nextScheduledTime

      // Wait until the scheduled time (with a small buffer for scheduling accuracy)
      const sleepDuration = scheduledTime - currentTime
      if (sleepDuration > 0) {
        await new Promise((resolve) => setTimeout(resolve, sleepDuration))
      }

      // Measure how much delay occurred before execution
      const actualExecutionTime = performance.now()
      const delay = actualExecutionTime - scheduledTime

      // Only record metrics if we're still within test duration
      if (actualExecutionTime - testStartTime < opts.testDuration) {
        monitoringMetrics.actualTicks++
        monitoringMetrics.delays.push(delay)
        monitoringMetrics.totalDelay += delay

        if (delay > monitoringMetrics.maxDelay) {
          monitoringMetrics.maxDelay = delay
        }
        if (delay < monitoringMetrics.minDelay) {
          monitoringMetrics.minDelay = delay
        }

        // Consider significant delay if it's more than 2x the expected interval
        if (delay > opts.monitoringInterval * 2) {
          monitoringMetrics.ticksWithSignificantDelay++
        }

        // Log significant delays in real-time
        if (delay > opts.monitoringInterval * 10) {
          log.log(
            `⚠️  Significant delay detected: ${delay.toFixed(2)}ms (expected ~${opts.monitoringInterval}ms)`
          )
        }

        // Schedule the next tick
        nextScheduledTime = scheduledTime + opts.monitoringInterval
      } else {
        // We've exceeded test duration, don't schedule another tick
        break
      }
    }
  })()

  // Start the subscription (or a no-op baseline)
  const subscriptionPromise = (async () => {
    if (opts.monitoringOnly) {
      // Baseline run: do nothing but keep the process alive for the duration.
      await new Promise((resolve) => setTimeout(resolve, opts.testDuration))
      return
    }

    log.log("Starting balance subscription...")
    try {
      // EVM modules don't require miniMetadata, only substrate modules do
      // Type assertion needed because TypeScript sees union of all module types
      const subscribeFn = balanceModule.subscribeBalances as (params: {
        networkId: string
        tokensWithAddresses: Array<[Token, string[]]>
        connector: IChainConnectorEth
      }) => ReturnType<typeof balanceModule.subscribeBalances>

      const observable = subscribeFn({
        networkId: network.id,
        tokensWithAddresses,
        connector,
      })

      log.log("✓ Subscription started")

      const subscription = observable.subscribe({
        next: (balances) => {
          const emissionTime = performance.now()
          subscriptionMetrics.emissions++

          if (subscriptionMetrics.emissions === 1) {
            subscriptionMetrics.firstEmissionTime = emissionTime - testStartTime
            log.log(
              `✓ First emission received at ${subscriptionMetrics.firstEmissionTime.toFixed(2)}ms`
            )
          } else {
            log.log(`✓ Emission ${subscriptionMetrics.emissions} received`)
          }

          log.log(`    - Success: ${balances.success?.length || 0} balances`)
          log.log(`    - Errors: ${balances.errors?.length || 0} errors`)
        },
        error: (error) => {
          subscriptionMetrics.errors.push(error as Error)
          log.error("Subscription error:", error)
        },
      })

      // Wait for test duration
      await new Promise((resolve) => setTimeout(resolve, opts.testDuration))

      subscription.unsubscribe()
    } catch (error) {
      log.error("Failed to start subscription:", error)
      throw error
    }
  })()

  // Wait for both to complete
  log.log()
  log.log(`Running test for ${opts.testDuration}ms...`)
  log.log(`Monitoring loop running every ${opts.monitoringInterval}ms...`)
  log.log()

  await Promise.all([monitoringPromise, subscriptionPromise])

  const testEndTime = performance.now()
  const totalTestTime = testEndTime - testStartTime

  elDelay.disable()

  // Calculate statistics
  const avgDelay =
    monitoringMetrics.actualTicks > 0
      ? monitoringMetrics.totalDelay / monitoringMetrics.actualTicks
      : 0
  const significantDelayPercentage =
    monitoringMetrics.actualTicks > 0
      ? (monitoringMetrics.ticksWithSignificantDelay / monitoringMetrics.actualTicks) * 100
      : 0

  // Print results
  log.log()
  log.log("=".repeat(80))
  log.log("Thread Blocking Test Results")
  log.log("=".repeat(80))
  log.log()

  log.log("Monitoring Loop Metrics:")
  log.log(`  Expected ticks: ${monitoringMetrics.expectedTicks}`)
  log.log(`  Actual ticks: ${monitoringMetrics.actualTicks}`)
  log.log(
    `  Tick accuracy: ${((monitoringMetrics.actualTicks / monitoringMetrics.expectedTicks) * 100).toFixed(2)}%`
  )
  log.log()
  log.log(`  Minimum delay: ${monitoringMetrics.minDelay.toFixed(2)}ms`)
  log.log(`  Maximum delay: ${monitoringMetrics.maxDelay.toFixed(2)}ms`)
  log.log(`  Average delay: ${avgDelay.toFixed(2)}ms`)
  log.log(`  Total delay: ${monitoringMetrics.totalDelay.toFixed(2)}ms`)
  log.log()
  log.log(
    `  Ticks with significant delay (>${opts.monitoringInterval * 2}ms): ${monitoringMetrics.ticksWithSignificantDelay}`
  )
  log.log(`  Significant delay percentage: ${significantDelayPercentage.toFixed(2)}%`)
  log.log()

  log.log("Subscription Metrics:")
  log.log(`  Total emissions: ${subscriptionMetrics.emissions}`)
  log.log(`  First emission time: ${subscriptionMetrics.firstEmissionTime.toFixed(2)}ms`)
  if (subscriptionMetrics.errors.length > 0) {
    log.log(`  Errors: ${subscriptionMetrics.errors.length}`)
    subscriptionMetrics.errors.forEach((error, i) => {
      log.log(`    ${i + 1}. ${error.message}`)
    })
  }
  log.log()

  // Event loop delay histogram summary (ms)
  const elMinMs = elDelay.min / 1e6
  const elMaxMs = elDelay.max / 1e6
  const elMeanMs = elDelay.mean / 1e6
  // `percentile()` expects 0..100
  const elP50Ms = elDelay.percentile(50) / 1e6
  const elP95Ms = elDelay.percentile(95) / 1e6
  const elP99Ms = elDelay.percentile(99) / 1e6

  log.log("Event Loop Delay (Node histogram):")
  log.log(`  Min: ${elMinMs.toFixed(3)}ms`)
  log.log(`  P50: ${elP50Ms.toFixed(3)}ms`)
  log.log(`  P95: ${elP95Ms.toFixed(3)}ms`)
  log.log(`  P99: ${elP99Ms.toFixed(3)}ms`)
  log.log(`  Mean: ${elMeanMs.toFixed(3)}ms`)
  log.log(`  Max: ${elMaxMs.toFixed(3)}ms`)
  log.log()

  log.log("Thread Blocking Analysis:")
  // Two independent signals:
  // - monitoringMetrics.maxDelay (scheduled-loop lateness)
  // - elDelay.max (actual event-loop stall)
  const threadBlockingDetected =
    monitoringMetrics.maxDelay > opts.monitoringInterval * 10 ||
    elMaxMs > opts.monitoringInterval * 10

  if (threadBlockingDetected) {
    log.log(`  ⚠️  THREAD BLOCKING DETECTED`)
    log.log(`  Monitoring max lateness: ${monitoringMetrics.maxDelay.toFixed(2)}ms`)
    log.log(`  Event loop max stall: ${elMaxMs.toFixed(3)}ms`)
    log.log(`  This indicates the subscription is blocking the event loop`)
  } else if (monitoringMetrics.maxDelay > opts.monitoringInterval * 2) {
    log.log(`  ⚠️  Minor thread blocking detected`)
    log.log(`  Maximum delay: ${monitoringMetrics.maxDelay.toFixed(2)}ms`)
  } else {
    log.log(`  ✓ No significant thread blocking detected`)
    log.log(`  Maximum delay: ${monitoringMetrics.maxDelay.toFixed(2)}ms (within acceptable range)`)
  }
  log.log()

  return {
    totalTestTime,
    monitoringMetrics: {
      expectedTicks: monitoringMetrics.expectedTicks,
      actualTicks: monitoringMetrics.actualTicks,
      minDelay: monitoringMetrics.minDelay,
      maxDelay: monitoringMetrics.maxDelay,
      avgDelay,
      ticksWithSignificantDelay: monitoringMetrics.ticksWithSignificantDelay,
      significantDelayPercentage,
    },
    subscriptionMetrics: {
      emissions: subscriptionMetrics.emissions,
      firstEmissionTime: subscriptionMetrics.firstEmissionTime,
      errors: subscriptionMetrics.errors,
    },
    eventLoopDelayMetrics: {
      minMs: elMinMs,
      p50Ms: elP50Ms,
      p95Ms: elP95Ms,
      p99Ms: elP99Ms,
      meanMs: elMeanMs,
      maxMs: elMaxMs,
    },
    threadBlockingDetected,
  }
}
