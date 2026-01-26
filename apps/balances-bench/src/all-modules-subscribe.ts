import { webcrypto } from "node:crypto"
import { monitorEventLoopDelay } from "node:perf_hooks"

import { BALANCE_MODULES } from "@talismn/balances"
import type {
  IChainConnectorDot,
  IChainConnectorEth,
  IChainConnectorSol,
} from "@talismn/chain-connectors"
import type { Token } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import type { Subscription } from "rxjs"

import { setupModule } from "./common/setupModule"
import { setupModuleEth } from "./common/setupModuleEth"
import { setupModuleSol } from "./common/setupModuleSol"
import type { DotNetworkConfig } from "./common/testSubscribeBalances"
import type { EthNetworkConfig } from "./common/testSubscribeBalancesEth"
import type { SolNetworkConfig } from "./common/testSubscribeBalancesSol"

// Ensure globalThis.crypto is available (for Node.js)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto
}

const TEST_ADDRESS_SUB = "5CcU6DRpocLUWYJHuNLjB4gGyHJrkWuruQD5XFbRYffCfSAP"
const TEST_ADDRESS_SUB2 = "5G24oH9LoJkBDuR4Hm7EUWiy2rPrsUSCTzY7fRcmxQNu6R1C"
const TEST_ADDRESS_ETH = "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67"
const TEST_ADDRESS_ETH2 = "0x1367e59070Ec898867C35c0600C0ec7483c96AF9"
const TEST_ADDRESS_SOL = "5xJvx7YrqCqgyzxx4PQXt1AVbxioUsGABf2zevmYC8UL"
const TEST_ADDRESS_SOL2 = "J4Zbo8YswSM6aqSFQkbTito3eiTMCwDn9ei3FaMUinB3"

// Network configurations for each module type
const SUBSTRATE_NETWORK_CONFIG: DotNetworkConfig = {
  id: "polkadot",
  rpcs: ["wss://rpc.polkadot.io"],
  nativeCurrency: { coingeckoId: "polkadot" },
  tokens: {
    "substrate-assets": [
      {
        assetId: "1984",
        symbol: "USDT",
        coingeckoId: "tether",
      },
    ],
    "substrate-foreignassets": [
      {
        assetId: "1984",
        symbol: "USDT",
        coingeckoId: "tether",
      },
    ],
    "substrate-psp22": [],
    "substrate-tokens": [
      {
        assetId: "1",
        symbol: "CFG",
        coingeckoId: "centrifuge",
      },
    ],
  },
}

const SUBSTRATE_DTAO_NETWORK_CONFIG: DotNetworkConfig = {
  id: "bittensor",
  rpcs: ["wss://entrypoint-finney.opentensor.ai"],
  nativeCurrency: { coingeckoId: "bittensor" },
  tokens: {},
}

const EVM_NETWORK_CONFIG: EthNetworkConfig = {
  id: "1",
  rpcs: [
    "https://mempool.merkle.io/rpc/eth/pk_mbs_1412a7392bd47753ca2b4bb3d123f6a1",
    "https://ethereum-rpc.publicnode.com",
    "https://eth.merkle.io",
  ],
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  contracts: {
    Erc20Aggregator: "0x2e556284556ecEe5754d201bBB6E2cb47fB95DFd" as `0x${string}`,
    Multicall3: "0xca11bde05977b3631167028862be2a173976ca11" as `0x${string}`,
  },
  tokens: {
    "evm-erc20": [
      {
        contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        symbol: "USDC",
        coingeckoId: "usd-coin",
      },
    ],
    "evm-uniswapv2": [
      {
        contractAddress: "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc",
      },
    ],
  },
}

const SOLANA_NETWORK_CONFIG: SolNetworkConfig = {
  id: "solana-mainnet",
  rpcs: ["https://api.mainnet-beta.solana.com"],
  nativeCurrency: {
    name: "Solana",
    symbol: "SOL",
    decimals: 9,
  },
  tokens: {
    "sol-spl": [
      {
        mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      },
    ],
  },
}

type ModuleSubscription = {
  moduleType: string
  subscription: Subscription
  connector: IChainConnectorDot | IChainConnectorEth | IChainConnectorSol
  networkId: string
  emissions: number
  errors: Error[]
}

/**
 * Test that runs ALL balance modules simultaneously to check for thread blocking
 * under concurrent load.
 */
async function testAllModules() {
  const testDuration = 30000 // 30 seconds
  const monitoringInterval = 5 // 5ms

  log.log()
  log.log("=".repeat(80))
  log.log("Thread Blocking Test: ALL Balance Modules Simultaneously")
  log.log("=".repeat(80))
  log.log()

  // Set up all modules
  log.log("Setting up all balance modules...")
  const setups = await Promise.all([
    // Substrate modules
    setupModule(SUBSTRATE_NETWORK_CONFIG, "substrate-native").then((s) => ({
      type: "substrate-native" as const,
      setup: s,
      platform: "polkadot" as const,
    })),
    setupModule(SUBSTRATE_NETWORK_CONFIG, "substrate-assets").then((s) => ({
      type: "substrate-assets" as const,
      setup: s,
      platform: "polkadot" as const,
    })),
    setupModule(SUBSTRATE_DTAO_NETWORK_CONFIG, "substrate-dtao").then((s) => ({
      type: "substrate-dtao" as const,
      setup: s,
      platform: "polkadot" as const,
    })),
    setupModule(SUBSTRATE_NETWORK_CONFIG, "substrate-hydration").then((s) => ({
      type: "substrate-hydration" as const,
      setup: s,
      platform: "polkadot" as const,
    })),
    setupModule(SUBSTRATE_NETWORK_CONFIG, "substrate-foreignassets").then((s) => ({
      type: "substrate-foreignassets" as const,
      setup: s,
      platform: "polkadot" as const,
    })),
    setupModule(SUBSTRATE_NETWORK_CONFIG, "substrate-psp22").then((s) => ({
      type: "substrate-psp22" as const,
      setup: s,
      platform: "polkadot" as const,
    })),
    setupModule(SUBSTRATE_NETWORK_CONFIG, "substrate-tokens").then((s) => ({
      type: "substrate-tokens" as const,
      setup: s,
      platform: "polkadot" as const,
    })),
    // EVM modules
    setupModuleEth(EVM_NETWORK_CONFIG, "evm-native").then((s) => ({
      type: "evm-native" as const,
      setup: s,
      platform: "ethereum" as const,
    })),
    setupModuleEth(EVM_NETWORK_CONFIG, "evm-erc20").then((s) => ({
      type: "evm-erc20" as const,
      setup: s,
      platform: "ethereum" as const,
    })),
    setupModuleEth(EVM_NETWORK_CONFIG, "evm-uniswapv2").then((s) => ({
      type: "evm-uniswapv2" as const,
      setup: s,
      platform: "ethereum" as const,
    })),
    // Solana modules
    setupModuleSol(SOLANA_NETWORK_CONFIG, "sol-native").then((s) => ({
      type: "sol-native" as const,
      setup: s,
      platform: "solana" as const,
    })),
    setupModuleSol(SOLANA_NETWORK_CONFIG, "sol-spl").then((s) => ({
      type: "sol-spl" as const,
      setup: s,
      platform: "solana" as const,
    })),
  ])

  log.log(`✓ Set up ${setups.length} modules`)
  log.log()

  // Metrics for monitoring loop
  const monitoringMetrics = {
    expectedTicks: Math.floor(testDuration / monitoringInterval),
    actualTicks: 0,
    delays: [] as number[],
    maxDelay: 0,
    minDelay: Infinity,
    totalDelay: 0,
    ticksWithSignificantDelay: 0,
  }

  // Track subscriptions
  const subscriptions: ModuleSubscription[] = []

  const testStartTime = performance.now()

  // Node-level event loop delay histogram
  const elDelay = monitorEventLoopDelay({ resolution: 10 })
  elDelay.enable()

  // Start the monitoring loop
  log.log("Starting monitoring loop...")
  const monitoringPromise = (async () => {
    let nextScheduledTime = testStartTime + monitoringInterval

    while (true) {
      const currentTime = performance.now()
      const elapsed = currentTime - testStartTime

      if (elapsed >= testDuration) {
        break
      }

      const scheduledTime = nextScheduledTime
      const sleepDuration = scheduledTime - currentTime
      if (sleepDuration > 0) {
        await new Promise((resolve) => setTimeout(resolve, sleepDuration))
      }

      const actualExecutionTime = performance.now()
      const delay = actualExecutionTime - scheduledTime

      if (actualExecutionTime - testStartTime < testDuration) {
        monitoringMetrics.actualTicks++
        monitoringMetrics.delays.push(delay)
        monitoringMetrics.totalDelay += delay

        if (delay > monitoringMetrics.maxDelay) {
          monitoringMetrics.maxDelay = delay
        }
        if (delay < monitoringMetrics.minDelay) {
          monitoringMetrics.minDelay = delay
        }

        if (delay > monitoringInterval * 2) {
          monitoringMetrics.ticksWithSignificantDelay++
        }

        if (delay > monitoringInterval * 10) {
          log.log(
            `⚠️  Significant delay detected: ${delay.toFixed(2)}ms (expected ~${monitoringInterval}ms)`
          )
        }

        nextScheduledTime = scheduledTime + monitoringInterval
      } else {
        break
      }
    }
  })()

  // Start all subscriptions
  log.log("Starting all balance subscriptions...")
  const subscriptionPromises = setups.map(async (item) => {
    const mod = BALANCE_MODULES.find((m) => m.type === item.type && m.platform === item.platform)
    if (!mod) {
      throw new Error(`Module ${item.type} not found`)
    }

    try {
      let observable: ReturnType<typeof mod.subscribeBalances>
      let connector: IChainConnectorDot | IChainConnectorEth | IChainConnectorSol
      let networkId: string

      if (item.platform === "polkadot") {
        const setup = item.setup as Awaited<ReturnType<typeof setupModule>>
        connector = setup.connector
        networkId = setup.networkId
        const tokensWithAddresses: Array<[Token, string[]]> = setup.tokens.map((token) => [
          token,
          [TEST_ADDRESS_SUB, TEST_ADDRESS_SUB2],
        ])

        observable = mod.subscribeBalances({
          networkId: setup.networkId,
          tokensWithAddresses,
          connector: connector as never,
          miniMetadata: setup.miniMetadata as never,
        })
      } else if (item.platform === "ethereum") {
        const setup = item.setup as Awaited<ReturnType<typeof setupModuleEth>>
        connector = setup.connector
        networkId = setup.networkId
        const tokensWithAddresses: Array<[Token, string[]]> = setup.tokens.map((token) => [
          token,
          [TEST_ADDRESS_ETH, TEST_ADDRESS_ETH2],
        ])

        const balanceModule = mod
        observable = (
          balanceModule.subscribeBalances as (params: {
            networkId: string
            tokensWithAddresses: Array<[Token, string[]]>
            connector: IChainConnectorEth
          }) => ReturnType<typeof balanceModule.subscribeBalances>
        )({
          networkId: setup.networkId,
          tokensWithAddresses,
          connector: connector as IChainConnectorEth,
        })
      } else {
        // Solana
        const setup = item.setup as Awaited<ReturnType<typeof setupModuleSol>>
        connector = setup.connector
        networkId = setup.networkId
        const tokensWithAddresses: Array<[Token, string[]]> = setup.tokens.map((token) => [
          token,
          [TEST_ADDRESS_SOL, TEST_ADDRESS_SOL2],
        ])

        const balanceModule = mod
        observable = (
          balanceModule.subscribeBalances as (params: {
            networkId: string
            tokensWithAddresses: Array<[Token, string[]]>
            connector: IChainConnectorSol
          }) => ReturnType<typeof balanceModule.subscribeBalances>
        )({
          networkId: setup.networkId,
          tokensWithAddresses,
          connector: connector as IChainConnectorSol,
        })
      }

      const moduleSub: ModuleSubscription = {
        moduleType: item.type,
        subscription: null as unknown as Subscription,
        connector,
        networkId,
        emissions: 0,
        errors: [],
      }

      const subscription = observable.subscribe({
        next: () => {
          moduleSub.emissions++
          if (moduleSub.emissions === 1) {
            log.log(`✓ ${item.type}: First emission received`)
          }
        },
        error: (error) => {
          moduleSub.errors.push(error as Error)
          log.error(`${item.type} subscription error:`, error)
        },
      })

      moduleSub.subscription = subscription
      subscriptions.push(moduleSub)

      log.log(`✓ ${item.type}: Subscription started`)
    } catch (error) {
      log.error(`Failed to start subscription for ${item.type}:`, error)
    }
  })

  await Promise.all(subscriptionPromises)
  log.log(`✓ All ${subscriptions.length} subscriptions started`)
  log.log()

  log.log(`Running test for ${testDuration}ms...`)
  log.log(`Monitoring loop running every ${monitoringInterval}ms...`)
  log.log(`Active subscriptions: ${subscriptions.length}`)
  log.log()

  // Wait for test duration
  await Promise.all([
    monitoringPromise,
    new Promise((resolve) => setTimeout(resolve, testDuration)),
  ])

  elDelay.disable()

  // Unsubscribe from all subscriptions
  log.log("Unsubscribing from all subscriptions...")
  subscriptions.forEach((sub) => {
    sub.subscription.unsubscribe()
  })

  // Disconnect all connectors
  log.log("Disconnecting all connectors...")
  await Promise.all(
    subscriptions.map(async (sub) => {
      if ("asProvider" in sub.connector && typeof sub.connector.asProvider === "function") {
        try {
          const provider = sub.connector.asProvider(sub.networkId)
          if (provider && "disconnect" in provider && typeof provider.disconnect === "function") {
            await provider.disconnect()
          }
        } catch {
          // Some connectors might not support asProvider or might already be disconnected
          log.log(`  Note: Could not disconnect ${sub.moduleType} connector`)
        }
      }
    })
  )

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
  log.log("Thread Blocking Test Results (All Modules)")
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
    `  Ticks with significant delay (>${monitoringInterval * 2}ms): ${monitoringMetrics.ticksWithSignificantDelay}`
  )
  log.log(`  Significant delay percentage: ${significantDelayPercentage.toFixed(2)}%`)
  log.log()

  log.log("Subscription Metrics:")
  subscriptions.forEach((sub) => {
    log.log(`  ${sub.moduleType}:`)
    log.log(`    Emissions: ${sub.emissions}`)
    if (sub.errors.length > 0) {
      log.log(`    Errors: ${sub.errors.length}`)
      sub.errors.forEach((error, i) => {
        log.log(`      ${i + 1}. ${error.message}`)
      })
    }
  })
  log.log()

  // Event loop delay histogram summary (ms)
  const elMinMs = elDelay.min / 1e6
  const elMaxMs = elDelay.max / 1e6
  const elMeanMs = elDelay.mean / 1e6
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
  const threadBlockingDetected =
    monitoringMetrics.maxDelay > monitoringInterval * 10 || elMaxMs > monitoringInterval * 10

  if (threadBlockingDetected) {
    log.log(`  ⚠️  THREAD BLOCKING DETECTED`)
    log.log(`  Monitoring max lateness: ${monitoringMetrics.maxDelay.toFixed(2)}ms`)
    log.log(`  Event loop max stall: ${elMaxMs.toFixed(3)}ms`)
    log.log(`  This indicates the subscriptions are blocking the event loop`)
  } else if (monitoringMetrics.maxDelay > monitoringInterval * 2) {
    log.log(`  ⚠️  Minor thread blocking detected`)
    log.log(`  Maximum delay: ${monitoringMetrics.maxDelay.toFixed(2)}ms`)
  } else {
    log.log(`  ✓ No significant thread blocking detected`)
    log.log(`  Maximum delay: ${monitoringMetrics.maxDelay.toFixed(2)}ms (within acceptable range)`)
  }
  log.log()

  log.log("Thread blocking test completed successfully")
}

testAllModules()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error:", error)
    process.exit(1)
  })
