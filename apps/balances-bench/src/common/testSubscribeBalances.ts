import { BALANCE_MODULES } from "@talismn/balances"
import { ChainConnectorDotStub } from "@talismn/chain-connectors"
import type { DotNetwork, Token, TokenType } from "@talismn/chaindata-provider"
import { log } from "extension-shared"

const TEST_ADDRESS_SUB = "5CcU6DRpocLUWYJHuNLjB4gGyHJrkWuruQD5XFbRYffCfSAP"
const TEST_ADDRESS_SUB2 = "5G24oH9LoJkBDuR4Hm7EUWiy2rPrsUSCTzY7fRcmxQNu6R1C"

export type DotNetworkConfig = Pick<DotNetwork, "id" | "rpcs"> & {
  nativeCurrency?: Partial<DotNetwork["nativeCurrency"]>
  tokens: Partial<Record<TokenType, unknown[]>>
  balancesConfig?: Partial<Record<TokenType, unknown>>
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
}

/**
 * Tests whether subscribeBalances blocks the thread by measuring delays
 * in an async loop that runs concurrently with the subscription.
 *
 * The test runs a monitoring loop that attempts to execute every 5ms (default).
 * If the subscription is blocking the thread with synchronous I/O, we expect
 * to see massive delays in the monitoring loop execution.
 */
export const testSubscribeBalances = async (
  network: DotNetworkConfig,
  miniMetadata: unknown,
  tokens: Token[],
  options?: SubscribeBalancesTestOptions
) => {
  const opts: Required<SubscribeBalancesTestOptions> = {
    module: options?.module || "substrate-dtao",
    testDuration: options?.testDuration ?? 30000, // 30 seconds
    monitoringInterval: options?.monitoringInterval ?? 5, // 5ms
    setupTimeout: options?.setupTimeout ?? 30000,
  }

  const connector = new ChainConnectorDotStub(network as unknown as DotNetwork)

  const mod = BALANCE_MODULES.find((m) => m.type === opts.module && m.platform === "polkadot")
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
    [TEST_ADDRESS_SUB, TEST_ADDRESS_SUB2],
  ])

  log.log(`Test Configuration:`)
  log.log(`  - Module: ${opts.module}`)
  log.log(`  - Test Duration: ${opts.testDuration}ms`)
  log.log(`  - Monitoring Interval: ${opts.monitoringInterval}ms`)
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

  // Start the subscription
  log.log("Starting balance subscription...")
  const subscriptionPromise = (async () => {
    try {
      const observable = mod.subscribeBalances({
        networkId: network.id,
        tokensWithAddresses,
        connector: connector as never,
        miniMetadata: miniMetadata as never,
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

  log.log("Thread Blocking Analysis:")
  if (monitoringMetrics.maxDelay > opts.monitoringInterval * 10) {
    log.log(`  ⚠️  THREAD BLOCKING DETECTED`)
    log.log(
      `  Maximum delay (${monitoringMetrics.maxDelay.toFixed(2)}ms) is ${(monitoringMetrics.maxDelay / opts.monitoringInterval).toFixed(1)}x the expected interval`
    )
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
    threadBlockingDetected: monitoringMetrics.maxDelay > opts.monitoringInterval * 10,
  }
}
