import { firstValueFrom, ReplaySubject, Subject } from "rxjs"

import {
  makeChaindata,
  makeEthNetwork,
  makeEvmNativeToken,
  makeInvalidDotNetwork,
  makeInvalidToken,
  makeLegacyPersistedData,
  makeMiniMetadata,
  makeOrphanedNetwork,
  makeSubNativeToken,
  makeUnknownTokenTypeData,
} from "../__fixtures__/chaindata"
import type { ChaindataStorage } from "../provider/ChaindataProvider"
import type { Chaindata } from "./schema"

// ─── Mocks ─────────────────────────────────────────────────────────

let mockGithubChaindata$: Subject<Chaindata>

vi.mock("./githubChaindata", () => ({
  get githubChaindata$() {
    return mockGithubChaindata$
  },
}))

const mockInitChaindata = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}))

vi.mock("./initChaindata.json", () => ({
  default: new Proxy(
    {},
    {
      get(_target, prop) {
        return (mockInitChaindata.current as Record<string | symbol, unknown>)[prop]
      },
      ownKeys() {
        return Reflect.ownKeys(mockInitChaindata.current)
      },
      getOwnPropertyDescriptor(_target, prop) {
        if (prop in mockInitChaindata.current)
          return {
            configurable: true,
            enumerable: true,
            value: (mockInitChaindata.current as Record<string | symbol, unknown>)[prop],
          }
        return undefined
      },
    }
  ),
}))

vi.mock("../log", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ─── Import after mocks ────────────────────────────────────────────

import { getDefaultChaindata$ } from "./defaultChaindata"

const EMPTY_DATA: Chaindata = { networks: [], tokens: [], miniMetadatas: [] }

// ─── Helpers ───────────────────────────────────────────────────────

/** Subscribe upfront and poll for a target emission count */
const trackEmissions = (obs$: ReturnType<typeof getDefaultChaindata$>) => {
  const values: Chaindata[] = []
  const sub = obs$.subscribe((val) => values.push(val))

  const waitForCount = (count: number, timeoutMs = 2000) =>
    new Promise<Chaindata[]>((resolve, reject) => {
      if (values.length >= count) return resolve(values.slice())
      const interval = setInterval(() => {
        if (values.length >= count) {
          clearInterval(interval)
          clearTimeout(timeout)
          resolve(values.slice())
        }
      }, 10)
      const timeout = setTimeout(() => {
        clearInterval(interval)
        reject(new Error(`Timed out: got ${values.length}/${count} values`))
      }, timeoutMs)
    })

  return { values, sub, waitForCount }
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("getDefaultChaindata$", () => {
  let storage$: ReplaySubject<ChaindataStorage>

  beforeEach(() => {
    mockGithubChaindata$ = new Subject<Chaindata>()
    storage$ = new ReplaySubject<ChaindataStorage>(1)
    mockInitChaindata.current = makeChaindata()
  })

  // ── storageValidated$ pipeline ──────────────────────────────────

  describe("storageValidated$ pipeline", () => {
    it("emits validated chaindata for valid storage data", async () => {
      const result$ = getDefaultChaindata$(storage$)
      const valid = makeChaindata()
      storage$.next(valid)

      const data = await firstValueFrom(result$)
      expect(data).toEqual(valid)
    })

    it("emits EMPTY_DATA for invalid storage (wrong rpc protocol)", async () => {
      const result$ = getDefaultChaindata$(storage$)
      storage$.next(
        makeChaindata({
          networks: [makeInvalidDotNetwork() as never],
          tokens: [makeSubNativeToken()],
        })
      )

      const data = await firstValueFrom(result$)
      expect(data).toEqual(EMPTY_DATA)
    })

    it("emits EMPTY_DATA for orphaned network (nativeTokenId not in tokens)", async () => {
      const result$ = getDefaultChaindata$(storage$)
      storage$.next(
        makeChaindata({
          networks: [makeOrphanedNetwork()],
          tokens: [makeEvmNativeToken()],
        })
      )

      const data = await firstValueFrom(result$)
      expect(data).toEqual(EMPTY_DATA)
    })

    it("emits EMPTY_DATA for legacy data with extra props on network (strictObject)", async () => {
      const result$ = getDefaultChaindata$(storage$)
      storage$.next(makeLegacyPersistedData() as ChaindataStorage)

      const data = await firstValueFrom(result$)
      expect(data).toEqual(EMPTY_DATA)
    })

    it("emits EMPTY_DATA for unknown token type", async () => {
      const result$ = getDefaultChaindata$(storage$)
      storage$.next(makeUnknownTokenTypeData() as ChaindataStorage)

      const data = await firstValueFrom(result$)
      expect(data).toEqual(EMPTY_DATA)
    })

    it("validates each emission independently", async () => {
      const result$ = getDefaultChaindata$(storage$)
      const { waitForCount } = trackEmissions(result$)
      const valid = makeChaindata()

      storage$.next(makeUnknownTokenTypeData() as ChaindataStorage)
      storage$.next(valid)

      const values = await waitForCount(2)
      expect(values[0]).toEqual(EMPTY_DATA)
      expect(values[1]).toEqual(valid)
    })
  })

  // ── Schema evolution scenarios ──────────────────────────────────

  describe("schema evolution scenarios", () => {
    it("persisted data with extra fields on networks → EMPTY_DATA → recovers when github emits valid", async () => {
      const result$ = getDefaultChaindata$(storage$)
      const { waitForCount } = trackEmissions(result$)
      const valid = makeChaindata()

      // Legacy data → strictObject failure → EMPTY_DATA
      storage$.next(makeLegacyPersistedData() as ChaindataStorage)

      const first = await waitForCount(1)
      expect(first[0]).toEqual(EMPTY_DATA)

      // GitHub emits valid → triggers storage$.next(valid) → recovers
      mockGithubChaindata$.next(valid)

      const all = await waitForCount(2)
      expect(all[1]).toEqual(valid)
    })

    it("persisted data with missing required field on token → EMPTY_DATA", async () => {
      const result$ = getDefaultChaindata$(storage$)
      storage$.next({
        networks: [makeEthNetwork()],
        tokens: [makeInvalidToken() as never],
        miniMetadatas: [],
      })

      const data = await firstValueFrom(result$)
      expect(data).toEqual(EMPTY_DATA)
    })

    it("persisted data with unknown token type → EMPTY_DATA", async () => {
      const result$ = getDefaultChaindata$(storage$)
      storage$.next(makeUnknownTokenTypeData() as ChaindataStorage)

      const data = await firstValueFrom(result$)
      expect(data).toEqual(EMPTY_DATA)
    })

    it("completely malformed data (not an object with expected shape) → EMPTY_DATA", async () => {
      const result$ = getDefaultChaindata$(storage$)
      storage$.next("this is not valid" as unknown as ChaindataStorage)

      const data = await firstValueFrom(result$)
      expect(data).toEqual(EMPTY_DATA)
    })
  })

  // ── initChaindata fallback ──────────────────────────────────────

  describe("initChaindata fallback", () => {
    it("github error + storage empty → provisions with initChaindata", async () => {
      const result$ = getDefaultChaindata$(storage$)
      const { waitForCount } = trackEmissions(result$)

      // Seed storage with empty data
      storage$.next({ networks: [], tokens: [], miniMetadatas: [] })

      const initial = await waitForCount(1)
      expect(initial[0]).toEqual(EMPTY_DATA)

      // GitHub errors → fallback pushes initChaindata to storage$
      mockGithubChaindata$.error(new Error("fetch failed"))

      const all = await waitForCount(2)
      expect(all[1].networks.length).toBeGreaterThan(0)
      expect(all[1].tokens.length).toBeGreaterThan(0)
    })

    it("github error + storage NOT empty → does NOT provision", async () => {
      const result$ = getDefaultChaindata$(storage$)
      const existing = makeChaindata()
      const { values, waitForCount } = trackEmissions(result$)

      storage$.next(existing)
      await waitForCount(1)
      expect(values[0]).toEqual(existing)

      const nextSpy = vi.spyOn(storage$, "next")

      // Error from github → should NOT provision since storage is non-empty
      mockGithubChaindata$.error(new Error("fetch failed"))

      // Give async handler time to run
      await new Promise((r) => setTimeout(r, 50))

      // storage$.next should not have been called (no provisioning)
      expect(nextSpy).not.toHaveBeenCalled()
      // Still only 1 emission
      expect(values).toHaveLength(1)
    })
  })

  // ── GitHub sync ─────────────────────────────────────────────────

  describe("github sync", () => {
    it("github emits data different from storage → storage updated → new validated data emitted", async () => {
      const result$ = getDefaultChaindata$(storage$)
      const { waitForCount } = trackEmissions(result$)

      const initial = makeChaindata()
      storage$.next(initial)

      const first = await waitForCount(1)
      expect(first[0]).toEqual(initial)

      // GitHub emits different data
      const updated = makeChaindata({
        miniMetadatas: [
          makeMiniMetadata(),
          makeMiniMetadata({ id: "another-meta", chainId: "polkadot" }),
        ],
      })
      mockGithubChaindata$.next(updated)

      const all = await waitForCount(2)
      expect(all[1]).toEqual(updated)
    })

    it("github emits same data as storage → no update (isEqual)", async () => {
      const result$ = getDefaultChaindata$(storage$)
      const data = makeChaindata()
      storage$.next(data)

      await firstValueFrom(result$)

      const nextSpy = vi.spyOn(storage$, "next")

      // GitHub emits the same data
      mockGithubChaindata$.next(data)

      // Give async handler time to run
      await new Promise((r) => setTimeout(r, 50))
      expect(nextSpy).not.toHaveBeenCalled()
    })
  })

  // ── shareReplay behavior ────────────────────────────────────────

  describe("shareReplay behavior", () => {
    it("late subscriber gets last validated value", async () => {
      const result$ = getDefaultChaindata$(storage$)
      const data = makeChaindata()
      storage$.next(data)

      // First subscriber gets the value
      const first = await firstValueFrom(result$)
      expect(first).toEqual(data)

      // Late subscriber also gets the replayed value
      const late = await firstValueFrom(result$)
      expect(late).toEqual(data)
    })
  })
})
