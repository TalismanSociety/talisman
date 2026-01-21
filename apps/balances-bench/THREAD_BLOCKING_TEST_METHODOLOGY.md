# Thread Blocking Test Methodology

## Purpose

This test validates whether balance module subscriptions block the JavaScript event loop while waiting for I/O operations. The goal is to ensure that other operations can continue running in the same thread while balance subscriptions are active.

## Testing Approach

The test uses a **dual-phase comparison** methodology:

### Phase 1: Baseline (Monitoring Only)
- Runs a monitoring loop without any balance subscription
- Establishes a baseline for "normal" event loop behavior
- Measures timing accuracy and event loop delay in an idle state

### Phase 2: With Active Subscription
- Runs the same monitoring loop **concurrently** with an active balance subscription
- Compares metrics against the baseline to detect thread blocking

## How It Works

### Monitoring Loop
An async loop attempts to execute every 5ms (configurable via `monitoringInterval`):

1. **Schedules** the next execution time (`scheduledTime`)
2. **Waits** until that scheduled time using `setTimeout`
3. **Measures** the actual execution time
4. **Calculates delay**: `actualExecutionTime - scheduledTime`

If the thread is blocked:
- `setTimeout` callbacks fire late
- Measured delays will be significantly larger than the expected interval (5ms)
- Example: delays of 50ms+ instead of ~5ms indicate thread blocking

### Event Loop Delay Monitoring
Uses Node.js's built-in `monitorEventLoopDelay()` API to measure:
- **P50, P95, P99 percentiles** of event loop delay
- **Min/Max/Mean** delay values
- Provides a histogram of event loop lag over the test duration

## Metrics Collected

### Monitoring Loop Metrics
- **Expected vs Actual Ticks**: Number of iterations that should have executed vs did execute
- **Minimum/Maximum/Average Delay**: Range of delays between scheduled and actual execution
- **Ticks with Significant Delay**: Count of iterations with delay > 2x expected interval
- **Significant Delay Percentage**: Percentage of iterations affected by blocking

### Event Loop Delay Metrics
- **P50, P95, P99**: Percentile delays showing distribution of event loop lag
- **Min/Max/Mean**: Statistical summary of event loop delay

### Subscription Metrics
- **Total Emissions**: Number of balance updates received
- **First Emission Time**: Time until first balance update
- **Errors**: Any errors encountered during subscription

## Interpreting Results

### Thread Blocking Detected
- **Maximum delay** > 10x the monitoring interval (e.g., >50ms when interval is 5ms)
- **Significant delay percentage** > 1-2% of ticks
- **Event loop delay** (P99/Max) significantly higher in subscription phase vs baseline

### No Significant Blocking
- **Maximum delay** < 2-3x the monitoring interval
- **Significant delay percentage** < 0.5%
- **Event loop delay** metrics similar between baseline and subscription phases

### Example Interpretation
```
Baseline:
  Max delay: 20ms
  Significant delays: 0.07% of ticks
  Event Loop P99: 11.9ms

With Subscription:
  Max delay: 28ms
  Significant delays: 0.18% of ticks
  Event Loop P99: 11.6ms

Conclusion: Minor, intermittent blocking detected, but not severe.
The subscription does not completely lock the thread.
```

## Configuration

- **`testDuration`**: How long to run each phase (default: 30000ms / 30 seconds)
- **`monitoringInterval`**: How often the monitoring loop should execute (default: 5ms)
- **`monitoringOnly`**: Run baseline phase only (true) or both phases (false)

## Running the Test

```bash
# Run the test for substrate-dtao module
pnpm run --filter balances-bench dev:bittensor-subscribe
```

The test will:
1. Set up the balance module
2. Run baseline phase (monitoring only)
3. Run subscription phase (monitoring + active subscription)
4. Compare results and provide analysis
5. Exit automatically when complete
