import { expect, test } from "./fixtures"

type PerformanceMemory = {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

type PerformanceMetrics = {
  memory: PerformanceMemory
  timing: {
    domContentLoaded: number
    loadComplete: number
  }
  cpu: {
    longTasks: number
    totalBlockingTime: number
  }
}

async function collectMetrics(page: import("@playwright/test").Page): Promise<PerformanceMetrics> {
  return page.evaluate(() => {
    const memory = (performance as unknown as { memory: PerformanceMemory }).memory
    const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
    const longTasks = performance.getEntriesByType("longtask")

    return {
      memory: {
        usedJSHeapSize: memory?.usedJSHeapSize ?? 0,
        totalJSHeapSize: memory?.totalJSHeapSize ?? 0,
        jsHeapSizeLimit: memory?.jsHeapSizeLimit ?? 0,
      },
      timing: {
        domContentLoaded: navigation?.domContentLoadedEventEnd ?? 0,
        loadComplete: navigation?.loadEventEnd ?? 0,
      },
      cpu: {
        longTasks: longTasks.length,
        totalBlockingTime: longTasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0),
      },
    }
  })
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatMetricsReport(label: string, metrics: PerformanceMetrics): string {
  return [
    `=== ${label} ===`,
    `Memory: ${formatBytes(metrics.memory.usedJSHeapSize)} used / ${formatBytes(metrics.memory.totalJSHeapSize)} total / ${formatBytes(metrics.memory.jsHeapSizeLimit)} limit`,
    `Timing: DOM ready ${metrics.timing.domContentLoaded.toFixed(0)}ms, Load ${metrics.timing.loadComplete.toFixed(0)}ms`,
    `CPU: ${metrics.cpu.longTasks} long tasks, ${metrics.cpu.totalBlockingTime.toFixed(0)}ms total blocking time`,
  ].join("\n")
}

//300 MB heap threshold
const MAX_HEAP_MB = 300
const MAX_HEAP_BYTES = MAX_HEAP_MB * 1024 * 1024

// Memory should not grow more than 50% after repeated navigation
const MAX_MEMORY_GROWTH_RATIO = 1.5

// talismandev.eth, hardcoded so the watched-account form doesn't depend on live ENS resolution
const DEV_WALLET_ADDRESS = "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67"

test.describe("Performance", () => {
  test("Dashboard initial load - memory and CPU within limits", async ({
    onboardedPage,
    addWatchedAccount,
  }) => {
    await addWatchedAccount({ type: "ethereum", address: DEV_WALLET_ADDRESS, name: "Dev Wallet" })
    await onboardedPage.waitForTimeout(5000)

    const metrics = await collectMetrics(onboardedPage)
    await test.info().attach("dashboard-initial-load", {
      body: formatMetricsReport("Dashboard Initial Load", metrics),
      contentType: "text/plain",
    })

    expect(
      metrics.memory.usedJSHeapSize,
      `Heap usage ${formatBytes(metrics.memory.usedJSHeapSize)} exceeds ${MAX_HEAP_MB}MB limit`
    ).toBeLessThan(MAX_HEAP_BYTES)
  })

  test("Navigation does not leak memory", async ({ onboardedPage, extensionId }) => {
    const baseUrl = `chrome-extension://${extensionId}/dashboard.html`
    const routes = [
      "#/portfolio",
      "#/settings",
      "#/settings/general/language",
      "#/portfolio",
      "#/settings",
      "#/portfolio",
    ]

    // Warm up and get baseline
    await onboardedPage.goto(`${baseUrl}#/portfolio`)
    await onboardedPage.waitForTimeout(5000)
    const baseline = await collectMetrics(onboardedPage)

    // Navigate through routes repeatedly
    for (const route of routes) {
      await onboardedPage.goto(`${baseUrl}${route}`)
      await onboardedPage.waitForLoadState("load")
      await onboardedPage.waitForTimeout(500)
    }

    await onboardedPage.waitForTimeout(2000)
    const afterNavigation = await collectMetrics(onboardedPage)

    const growthRatio = afterNavigation.memory.usedJSHeapSize / baseline.memory.usedJSHeapSize

    await test.info().attach("memory-leak-check", {
      body: [
        formatMetricsReport("Baseline (after warmup)", baseline),
        "",
        formatMetricsReport("After navigation cycles", afterNavigation),
        "",
        `Memory growth ratio: ${growthRatio.toFixed(2)}x (limit: ${MAX_MEMORY_GROWTH_RATIO}x)`,
      ].join("\n"),
      contentType: "text/plain",
    })

    expect(
      growthRatio,
      `Memory grew ${growthRatio.toFixed(2)}x after navigation (limit: ${MAX_MEMORY_GROWTH_RATIO}x). Baseline: ${formatBytes(baseline.memory.usedJSHeapSize)}, After: ${formatBytes(afterNavigation.memory.usedJSHeapSize)}`
    ).toBeLessThan(MAX_MEMORY_GROWTH_RATIO)
  })

  test("Popup load - memory and CPU within limits", async ({
    onboardedPage,
    addWatchedAccount,
  }) => {
    await addWatchedAccount({ type: "ethereum", address: DEV_WALLET_ADDRESS, name: "Dev Wallet" })
    await onboardedPage.waitForTimeout(5000)

    const metrics = await collectMetrics(onboardedPage)
    await test.info().attach("popup-load", {
      body: formatMetricsReport("Popup Load", metrics),
      contentType: "text/plain",
    })

    expect(
      metrics.memory.usedJSHeapSize,
      `Popup heap ${formatBytes(metrics.memory.usedJSHeapSize)} exceeds ${MAX_HEAP_MB}MB limit`
    ).toBeLessThan(MAX_HEAP_BYTES)
  })
})
