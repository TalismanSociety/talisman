import { BALANCE_MODULES } from "@talismn/balances"
import { ChainConnectorDotStub } from "@talismn/chain-connectors"
import { DotNetwork, Token, TokenType } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { firstValueFrom } from "rxjs"

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
   * Number of subscription iterations to measure
   * Each iteration waits for one emission from the observable
   */
  iterations?: number
  /**
   * Timeout in ms for each iteration
   */
  iterationTimeout?: number
}

/**
 * Tests subscribeBalances performance by measuring:
 * - Time to first emission
 * - Time between emissions (poll intervals)
 * - Total blocking time
 * - Number of successful emissions
 */
export const testSubscribeBalances = async (
  network: DotNetworkConfig,
  miniMetadata: unknown,
  tokens: Token[],
  options?: SubscribeBalancesTestOptions,
) => {
  const opts: Required<SubscribeBalancesTestOptions> = {
    module: options?.module || "substrate-dtao",
    iterations: options?.iterations ?? 3,
    iterationTimeout: options?.iterationTimeout ?? 30000,
  }

  const connector = new ChainConnectorDotStub(network as unknown as DotNetwork)

  const mod = BALANCE_MODULES.find((m) => m.type === opts.module && m.platform === "polkadot")
  if (!mod) {
    throw new Error(`Module ${opts.module} not found`)
  }

  log.log()
  log.log("=".repeat(80))
  log.log(`Performance Test: subscribeBalances for ${opts.module}`)
  log.log("=".repeat(80))
  log.log()

  const tokensWithAddresses: Array<[Token, string[]]> = tokens.map((token) => [
    token,
    [TEST_ADDRESS_SUB, TEST_ADDRESS_SUB2],
  ])

  // Start performance measurement
  const testStartTime = performance.now()
  const metrics = {
    firstEmissionTime: 0,
    emissionTimes: [] as number[],
    totalBlockingTime: 0,
    successfulEmissions: 0,
    failedEmissions: 0,
    errors: [] as Error[],
  }

  log.log(`Starting subscription with ${opts.iterations} iterations...`)
  log.log(`Tokens: ${tokens.length}, Addresses: 2`)
  log.log()

  try {
    const observable = mod.subscribeBalances({
      networkId: network.id,
      tokensWithAddresses,
      connector: connector as never,
      miniMetadata: miniMetadata as never,
    })

    let isFirstEmission = true
    let previousEmissionTime = testStartTime

    for (let i = 0; i < opts.iterations; i++) {
      const iterationStartTime = performance.now()

      log.log(`[Iteration ${i + 1}/${opts.iterations}] Waiting for emission...`)

      try {
        // Measure time until emission
        const emissionStartTime = performance.now()

        const result = await Promise.race([
          firstValueFrom(observable),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Timeout after ${opts.iterationTimeout}ms`)),
              opts.iterationTimeout,
            ),
          ),
        ])

        const emissionEndTime = performance.now()
        const emissionTime = emissionEndTime - emissionStartTime

        // Calculate blocking time (time between previous emission and this one)
        const timeSinceLastEmission = emissionEndTime - previousEmissionTime
        previousEmissionTime = emissionEndTime

        if (isFirstEmission) {
          metrics.firstEmissionTime = emissionTime
          isFirstEmission = false
          log.log(`  ✓ First emission received in ${emissionTime.toFixed(2)}ms`)
        } else {
          metrics.emissionTimes.push(timeSinceLastEmission)
          log.log(
            `  ✓ Emission ${i + 1} received in ${emissionTime.toFixed(2)}ms (${timeSinceLastEmission.toFixed(2)}ms since last)`,
          )
        }

        metrics.successfulEmissions++
        metrics.totalBlockingTime += emissionTime

        // Log balance results
        const balances = result
        log.log(`    - Success: ${balances.success?.length || 0} balances`)
        log.log(`    - Errors: ${balances.errors?.length || 0} errors`)
        log.log()
      } catch (error) {
        const errorTime = performance.now() - iterationStartTime
        metrics.failedEmissions++
        metrics.errors.push(error as Error)
        metrics.totalBlockingTime += errorTime

        log.log(`  ✗ Emission ${i + 1} failed after ${errorTime.toFixed(2)}ms:`)
        log.error(error)
        log.log()

        // If first emission fails, break
        if (i === 0) {
          throw error
        }
      }

      // Small delay to separate iterations (only if not last)
      if (i < opts.iterations - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  } catch (error) {
    log.error("Test failed:", error)
    throw error
  }

  const testEndTime = performance.now()
  const totalTestTime = testEndTime - testStartTime

  // Calculate statistics
  const avgEmissionInterval =
    metrics.emissionTimes.length > 0
      ? metrics.emissionTimes.reduce((a, b) => a + b, 0) / metrics.emissionTimes.length
      : 0
  const avgBlockingTime =
    metrics.totalBlockingTime / (metrics.successfulEmissions + metrics.failedEmissions || 1)

  // Print results
  log.log()
  log.log("=".repeat(80))
  log.log("Performance Results")
  log.log("=".repeat(80))
  log.log()
  log.log(`Total test time: ${totalTestTime.toFixed(2)}ms`)
  log.log(`First emission time: ${metrics.firstEmissionTime.toFixed(2)}ms`)
  log.log(`Successful emissions: ${metrics.successfulEmissions}/${opts.iterations}`)
  log.log(`Failed emissions: ${metrics.failedEmissions}`)
  log.log()
  log.log(`Average time between emissions: ${avgEmissionInterval.toFixed(2)}ms`)
  log.log(`Average blocking time per emission: ${avgBlockingTime.toFixed(2)}ms`)
  log.log(`Total blocking time: ${metrics.totalBlockingTime.toFixed(2)}ms`)
  log.log(
    `Blocking time percentage: ${((metrics.totalBlockingTime / totalTestTime) * 100).toFixed(2)}%`,
  )
  log.log()

  if (metrics.errors.length > 0) {
    log.log("Errors encountered:")
    metrics.errors.forEach((error, i) => {
      log.log(`  ${i + 1}. ${error.message}`)
    })
    log.log()
  }

  return {
    totalTestTime,
    firstEmissionTime: metrics.firstEmissionTime,
    successfulEmissions: metrics.successfulEmissions,
    failedEmissions: metrics.failedEmissions,
    avgEmissionInterval,
    avgBlockingTime,
    totalBlockingTime: metrics.totalBlockingTime,
    blockingPercentage: (metrics.totalBlockingTime / totalTestTime) * 100,
  }
}
