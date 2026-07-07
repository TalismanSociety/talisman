/**
 * Optional host-provided JS-activity hook.
 *
 * Host apps that run a JS-thread stall watchdog (e.g. talisapp's jsThreadWatchdog) can
 * install `globalThis.__recordJsActivity` to receive lightweight "this just ran on the
 * JS thread" markers from library code. When a stall is detected, the watchdog can then
 * attribute the blocked time to whatever activity was recorded during the stall window.
 *
 * When no hook is installed this is a no-op (a single property read), so library code
 * can call it unconditionally from hot paths.
 */

type RecordJsActivity = (label: string, durationMs?: number) => void

export const reportJsActivity = (label: string, durationMs?: number): void => {
  const record = (globalThis as { __recordJsActivity?: RecordJsActivity }).__recordJsActivity
  if (record) record(label, durationMs)
}
