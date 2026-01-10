/* eslint-disable no-console */
import type { Browser } from "webextension-polyfill"
import { cloneDeep } from "lodash-es"
import { WebSocket } from "mock-socket"
import sinon from "sinon-chrome"
import { vi } from "vitest"

// Mock WebSocket in tests
globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket

// Create an in-memory storage implementation that works with chrome.storage API
function createStorageArea() {
  let data: Record<string, unknown> = {}
  const listeners: Array<
    (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>, areaName: string) => void
  > = []

  const notifyListeners = (
    changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
    areaName: string,
  ) => {
    listeners.forEach((listener) => listener(changes, areaName))
  }

  return {
    get: vi.fn((keys?: string | string[] | Record<string, unknown> | null) => {
      if (keys === null || keys === undefined) {
        return Promise.resolve({ ...data })
      }
      if (typeof keys === "string") {
        return Promise.resolve({ [keys]: data[keys] })
      }
      if (Array.isArray(keys)) {
        const result: Record<string, unknown> = {}
        keys.forEach((key) => {
          result[key] = data[key]
        })
        return Promise.resolve(result)
      }
      // keys is an object with defaults
      const result: Record<string, unknown> = {}
      Object.entries(keys).forEach(([key, defaultValue]) => {
        result[key] = data[key] !== undefined ? data[key] : defaultValue
      })
      return Promise.resolve(result)
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      const changes: Record<string, { newValue?: unknown; oldValue?: unknown }> = {}
      Object.entries(items).forEach(([key, value]) => {
        changes[key] = { oldValue: data[key], newValue: value }
        data[key] = value
      })
      notifyListeners(changes, "local")
      return Promise.resolve()
    }),
    remove: vi.fn((keys: string | string[]) => {
      const keysArray = Array.isArray(keys) ? keys : [keys]
      const changes: Record<string, { newValue?: unknown; oldValue?: unknown }> = {}
      keysArray.forEach((key) => {
        changes[key] = { oldValue: data[key] }
        delete data[key]
      })
      notifyListeners(changes, "local")
      return Promise.resolve()
    }),
    clear: vi.fn(() => {
      const changes: Record<string, { newValue?: unknown; oldValue?: unknown }> = {}
      Object.keys(data).forEach((key) => {
        changes[key] = { oldValue: data[key] }
      })
      data = {}
      notifyListeners(changes, "local")
      return Promise.resolve()
    }),
    // For testing - reset internal state
    _reset: () => {
      data = {}
    },
    _addListener: (
      listener: (
        changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
        areaName: string,
      ) => void,
    ) => {
      listeners.push(listener)
    },
    _removeListener: (
      listener: (
        changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
        areaName: string,
      ) => void,
    ) => {
      const index = listeners.indexOf(listener)
      if (index > -1) listeners.splice(index, 1)
    },
  }
}

const localStorage = createStorageArea()

const storage = {
  local: localStorage,
  onChanged: {
    addListener: vi.fn(
      (
        listener: (
          changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
          areaName: string,
        ) => void,
      ) => {
        localStorage._addListener(listener)
      },
    ),
    removeListener: vi.fn(
      (
        listener: (
          changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
          areaName: string,
        ) => void,
      ) => {
        localStorage._removeListener(listener)
      },
    ),
    hasListener: vi.fn(() => true),
    hasListeners: vi.fn(() => true),
  },
}

// Create a mock Port object for chrome.runtime.connect
function createMockPort(name?: string): chrome.runtime.Port {
  const disconnectListeners: Array<(port: chrome.runtime.Port) => void> = []
  const messageListeners: Array<(message: unknown, port: chrome.runtime.Port) => void> = []

  const port: chrome.runtime.Port = {
    name: name || "",
    disconnect: vi.fn(() => {
      disconnectListeners.forEach((listener) => listener(port))
    }),
    postMessage: vi.fn(),
    onDisconnect: {
      addListener: vi.fn((listener: (port: chrome.runtime.Port) => void) => {
        disconnectListeners.push(listener)
      }),
      removeListener: vi.fn((listener: (port: chrome.runtime.Port) => void) => {
        const index = disconnectListeners.indexOf(listener)
        if (index > -1) disconnectListeners.splice(index, 1)
      }),
      hasListener: vi.fn((listener: (port: chrome.runtime.Port) => void) =>
        disconnectListeners.includes(listener),
      ),
      hasListeners: vi.fn(() => disconnectListeners.length > 0),
      getRules: vi.fn(),
      removeRules: vi.fn(),
      addRules: vi.fn(),
    },
    onMessage: {
      addListener: vi.fn((listener: (message: unknown, port: chrome.runtime.Port) => void) => {
        messageListeners.push(listener)
      }),
      removeListener: vi.fn((listener: (message: unknown, port: chrome.runtime.Port) => void) => {
        const index = messageListeners.indexOf(listener)
        if (index > -1) messageListeners.splice(index, 1)
      }),
      hasListener: vi.fn((listener: (message: unknown, port: chrome.runtime.Port) => void) =>
        messageListeners.includes(listener),
      ),
      hasListeners: vi.fn(() => messageListeners.length > 0),
      getRules: vi.fn(),
      removeRules: vi.fn(),
      addRules: vi.fn(),
    },
  }

  return port
}

// Set up chrome/browser globals using sinon-chrome with our custom storage.
const chromeWithAsyncWindows = {
  ...sinon,
  storage,
  runtime: {
    ...sinon.runtime,
    connect: vi.fn(
      (
        extensionIdOrInfo?: string | chrome.runtime.ConnectInfo,
        _connectInfo?: chrome.runtime.ConnectInfo,
      ) => {
        const name =
          typeof extensionIdOrInfo === "string" ? extensionIdOrInfo : extensionIdOrInfo?.name
        return createMockPort(name)
      },
    ),
  },
  windows: {
    ...sinon.windows,
    create: (...args: unknown[]) =>
      new Promise((resolve) =>
        resolve(sinon.windows.create(...(args as Parameters<typeof sinon.windows.create>))),
      ),
  },
}
globalThis.chrome = chromeWithAsyncWindows as unknown as typeof chrome
;(globalThis as unknown as { browser: Browser }).browser =
  chromeWithAsyncWindows as unknown as Browser

process.env.VERSION = process.env.npm_package_version
// Required by @polkadot/extension-base to prevent message collisions between extensions
process.env.EXTENSION_PREFIX = "talisman-test"

// Hides this annoying warning which shows up for every test, as a result of us using pjs via an esm import:
// https://github.com/polkadot-js/api/issues/5636
//
// The warning isn't helpful in this context, and it also makes it a PITA to find the result of any failed tests
//
// We can remove this when we completely switch away from the @polkadot/api family of packages
process.env.POLKADOTJS_DISABLE_ESM_CJS_WARNING = "1"

// Somehow not available in jsdom
globalThis.structuredClone = cloneDeep

// Remove useless warnings
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  const msg = args[0]?.toString?.()
  // This is a harmless runtime warning coming from the bigint-buffer or similar native addon dependency,
  // which tries (and fails) to load a native Node.js binding, then falls back to pure JavaScript.
  if (msg?.includes("bigint: Failed to load bindings")) return
  originalWarn(...args)
}
