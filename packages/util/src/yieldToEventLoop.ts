/**
 * Returns a promise that resolves in a NEW macrotask, letting the host event loop
 * (react-native touch handling, browser rendering, node timers) run before continuing.
 *
 * Prefers `scheduler.postTask` at background priority where it exists: the continuation then
 * waits for pending work such as IPC replies and incoming messages, which a `MessageChannel`
 * task can starve.
 *
 * Otherwise uses `MessageChannel` where available (browser/node — avoids the setTimeout
 * nested-call clamp of ~4ms, which matters when yielding every ~10ms), and falls back to
 * `setTimeout(0)`.
 *
 * The fallback is required on react-native (Hermes), where `MessageChannel` does not exist.
 * NOTE: `setImmediate` must NOT be used for this on react-native — it flushes within the
 * same JS execution batch and does not return control to the native event loop.
 */
// minimal structural typing: the MessagePort type differs between DOM and node type
// libs (e.g. node's lacks `onmessage`), but both runtimes implement this shape
type MinimalMessagePort = {
  onmessage: ((event: unknown) => void) | null
  postMessage: (value: unknown) => void
  close: () => void
}

type MinimalScheduler = {
  postTask?: (task: () => void, options: { priority: "background" }) => Promise<void>
}

export const yieldToEventLoop = (): Promise<void> => {
  const { scheduler } = globalThis as { scheduler?: MinimalScheduler }
  if (typeof scheduler?.postTask === "function")
    return scheduler.postTask(() => {}, { priority: "background" })

  if (typeof MessageChannel !== "undefined") {
    return new Promise((resolve) => {
      const channel = new MessageChannel()
      const port1 = channel.port1 as unknown as MinimalMessagePort
      const port2 = channel.port2 as unknown as MinimalMessagePort
      port1.onmessage = () => {
        // close both ports so the channel doesn't keep a node process alive
        port1.close()
        port2.close()
        resolve()
      }
      port2.postMessage(null)
    })
  }

  return new Promise((resolve) => setTimeout(resolve, 0))
}
