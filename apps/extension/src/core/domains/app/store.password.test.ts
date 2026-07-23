import { BehaviorSubject } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest"

// ── Chrome API mocks ──────────────────────────────────────────────

const alarmListeners: ((alarm: { name: string }) => void)[] = []
const activeAlarms = new Map<string, { name: string; scheduledTime: number }>()

const chromeMock = {
  alarms: {
    get: vi.fn(async (name: string) => activeAlarms.get(name)),
    clear: vi.fn(async (name: string) => {
      activeAlarms.delete(name)
      return true
    }),
    create: vi.fn(async (name: string, info: { delayInMinutes: number }) => {
      activeAlarms.set(name, { name, scheduledTime: Date.now() + info.delayInMinutes * 60_000 })
    }),
    onAlarm: {
      addListener: vi.fn((cb: (alarm: { name: string }) => void) => {
        alarmListeners.push(cb)
      }),
    },
  },
  storage: {
    session: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {}),
      remove: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    },
    local: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {}),
    },
  },
}
vi.stubGlobal("chrome", chromeMock)

// ── Mock dependencies ──────────────────────────────────────────────

vi.mock("../../notifications", () => ({
  createNotification: vi.fn(),
}))

vi.mock("../../util/sessionStorageCompat", () => {
  let stored: Record<string, unknown> = {}
  return {
    sessionStorage: {
      get: vi.fn(async (key: string) => stored[key]),
      set: vi.fn(async (data: Record<string, unknown>) => {
        Object.assign(stored, data)
      }),
      remove: vi.fn(async (key: string) => {
        delete stored[key]
      }),
      clear: vi.fn(async () => {
        stored = {}
      }),
    },
  }
})

vi.mock("../../libs/Store", () => {
  return {
    StorageProvider: class {
      #data: Record<string, unknown>
      constructor(_prefix: string, data: Record<string, unknown>) {
        this.#data = { ...data }
      }
      async get(key?: string) {
        if (key) return this.#data[key]
        return { ...this.#data }
      }
      async set(data: Record<string, unknown>) {
        Object.assign(this.#data, data)
      }
    },
  }
})

// ── Import SUT after mocks ──────────────────────────────────────────

const { PasswordStore } = await import("./store.password")
const { createNotification } = await import("../../notifications")

const ALARM_NAME = "talisman-autolock-alarm"

describe("PasswordStore autolock timer", () => {
  let store: InstanceType<typeof PasswordStore>

  beforeEach(() => {
    vi.clearAllMocks()
    activeAlarms.clear()
    alarmListeners.length = 0
    store = new PasswordStore("test-password", {
      isTrimmed: false,
      isHashed: false,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("resetAutolockTimer", () => {
    it("skips when isLoggedIn is UNKNOWN", async () => {
      // isLoggedIn starts as UNKNOWN until hasPassword resolves
      store.isLoggedIn = new BehaviorSubject<"TRUE" | "FALSE" | "UNKNOWN">("UNKNOWN")

      await store.resetAutolockTimer(15)

      expect(chromeMock.alarms.create).not.toHaveBeenCalled()
      expect(chromeMock.alarms.clear).not.toHaveBeenCalled()
    })

    it("clears alarm when isLoggedIn is FALSE", async () => {
      store.isLoggedIn.next("FALSE")
      activeAlarms.set(ALARM_NAME, { name: ALARM_NAME, scheduledTime: Date.now() + 60_000 })

      await store.resetAutolockTimer(15)

      expect(chromeMock.alarms.clear).toHaveBeenCalledWith(ALARM_NAME)
      expect(chromeMock.alarms.create).not.toHaveBeenCalled()
    })

    it("preserves existing alarm when minutes is undefined (settings not loaded)", async () => {
      store.isLoggedIn.next("TRUE")
      activeAlarms.set(ALARM_NAME, { name: ALARM_NAME, scheduledTime: Date.now() + 60_000 })

      await store.resetAutolockTimer(undefined)

      expect(chromeMock.alarms.create).not.toHaveBeenCalled()
      expect(chromeMock.alarms.clear).not.toHaveBeenCalled()
      expect(activeAlarms.has(ALARM_NAME)).toBe(true)
    })

    it("clears alarm when minutes is 0 (user disabled auto-lock)", async () => {
      store.isLoggedIn.next("TRUE")
      activeAlarms.set(ALARM_NAME, { name: ALARM_NAME, scheduledTime: Date.now() + 60_000 })

      await store.resetAutolockTimer(0)

      expect(chromeMock.alarms.clear).toHaveBeenCalledWith(ALARM_NAME)
      expect(chromeMock.alarms.create).not.toHaveBeenCalled()
      expect(activeAlarms.has(ALARM_NAME)).toBe(false)
    })

    it("creates a one-shot alarm when logged in with valid minutes", async () => {
      store.isLoggedIn.next("TRUE")

      await store.resetAutolockTimer(15)

      expect(chromeMock.alarms.create).toHaveBeenCalledWith(ALARM_NAME, { delayInMinutes: 15 })
      // verify no periodInMinutes (one-shot, not repeating)
      const createCall = (chromeMock.alarms.create as Mock).mock.calls[0]
      expect(createCall[1]).not.toHaveProperty("periodInMinutes")
    })

    it("clears existing alarm before creating a new one (explicit reset)", async () => {
      store.isLoggedIn.next("TRUE")
      activeAlarms.set(ALARM_NAME, { name: ALARM_NAME, scheduledTime: Date.now() + 60_000 })

      await store.resetAutolockTimer(30)

      expect(chromeMock.alarms.clear).toHaveBeenCalledWith(ALARM_NAME)
      expect(chromeMock.alarms.create).toHaveBeenCalledWith(ALARM_NAME, { delayInMinutes: 30 })
    })

    it("preserves existing alarm on startup when it fires sooner (preserveExisting)", async () => {
      store.isLoggedIn.next("TRUE")
      // Alarm scheduled to fire in 3 minutes
      const threeMinFromNow = Date.now() + 3 * 60_000
      activeAlarms.set(ALARM_NAME, { name: ALARM_NAME, scheduledTime: threeMinFromNow })

      await store.resetAutolockTimer(15, { preserveExisting: true })

      // Should NOT replace the alarm — existing one fires sooner
      expect(chromeMock.alarms.create).not.toHaveBeenCalled()
      expect(activeAlarms.get(ALARM_NAME)?.scheduledTime).toBe(threeMinFromNow)
    })

    it("replaces existing alarm on startup when new one fires sooner (preserveExisting)", async () => {
      store.isLoggedIn.next("TRUE")
      // Alarm scheduled to fire in 30 minutes
      const thirtyMinFromNow = Date.now() + 30 * 60_000
      activeAlarms.set(ALARM_NAME, { name: ALARM_NAME, scheduledTime: thirtyMinFromNow })

      await store.resetAutolockTimer(5, { preserveExisting: true })

      // Should replace — new 5-min alarm fires sooner than existing 30-min
      expect(chromeMock.alarms.clear).toHaveBeenCalledWith(ALARM_NAME)
      expect(chromeMock.alarms.create).toHaveBeenCalledWith(ALARM_NAME, { delayInMinutes: 5 })
    })

    it("creates alarm on startup when none exists (preserveExisting)", async () => {
      store.isLoggedIn.next("TRUE")

      await store.resetAutolockTimer(15, { preserveExisting: true })

      // No existing alarm → should create one
      expect(chromeMock.alarms.create).toHaveBeenCalledWith(ALARM_NAME, { delayInMinutes: 15 })
    })
  })

  describe("alarm listener (auto-lock trigger)", () => {
    it("clears password and notifies when alarm fires and user is logged in", async () => {
      store.isLoggedIn.next("TRUE")

      // simulate alarm firing
      await Promise.all(alarmListeners.map((listener) => listener({ name: ALARM_NAME })))

      // password should be cleared (isLoggedIn → FALSE)
      expect(store.isLoggedIn.value).toBe("FALSE")
      expect(createNotification).toHaveBeenCalledWith("autolocked", "", "autolocked")
    })

    it("ignores alarm with wrong name", () => {
      store.isLoggedIn.next("TRUE")

      for (const listener of alarmListeners) {
        listener({ name: "some-other-alarm" })
      }

      expect(store.isLoggedIn.value).toBe("TRUE")
      expect(createNotification).not.toHaveBeenCalled()
    })

    it("ignores alarm when not logged in", () => {
      store.isLoggedIn.next("FALSE")

      for (const listener of alarmListeners) {
        listener({ name: ALARM_NAME })
      }

      expect(createNotification).not.toHaveBeenCalled()
    })
  })

  describe("clearPassword", () => {
    it("clears password and clears autolock alarm", async () => {
      store.isLoggedIn.next("TRUE")
      activeAlarms.set(ALARM_NAME, { name: ALARM_NAME, scheduledTime: Date.now() + 60_000 })

      await store.clearPassword()

      expect(store.isLoggedIn.value).toBe("FALSE")
      expect(chromeMock.alarms.clear).toHaveBeenCalledWith(ALARM_NAME)
      expect(activeAlarms.has(ALARM_NAME)).toBe(false)
    })
  })
})
