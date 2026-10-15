import { filter, firstValueFrom } from "rxjs"
import { beforeEach, describe, expect, it } from "vitest"

import { sessionStorage } from "../../util/sessionStorageCompat"
import { type LockFact, PasswordStore, type UnlockMethod } from "./store.password"

const PASSWORD_UNLOCK: UnlockMethod = { method: "password", legacyPassword: false }

describe("PasswordStore lock facts", () => {
  let store: PasswordStore
  let facts: LockFact[]

  beforeEach(async () => {
    await sessionStorage.clear()
    store = new PasswordStore("lockFactsTest")
    await firstValueFrom(store.isLoggedIn.pipe(filter((state) => state !== "UNKNOWN")))
    facts = []
    store.lockFacts$.subscribe((fact) => facts.push(fact))
  })

  it("publishes nothing when a locked wallet locks again, as a failed login does", async () => {
    await store.clearPassword("error")

    expect(facts).toEqual([])
  })

  it("publishes nothing for onboarding or a password change", async () => {
    await store.setPassword("hashed", "onboarding")
    await store.setPassword("rehashed", "password_change")

    expect(store.isLoggedIn.value).toBe("TRUE")
    expect(facts).toEqual([])
  })

  it("publishes an unlock once, only from the locked state", async () => {
    await store.setPassword("hashed", PASSWORD_UNLOCK)
    await store.setPassword("hashed", PASSWORD_UNLOCK)

    expect(facts).toEqual([{ type: "unlocked", how: PASSWORD_UNLOCK }])
  })

  it("publishes a lock with its reason when an unlocked wallet locks", async () => {
    await store.setPassword("hashed", "onboarding")

    await store.clearPassword("auto_lock")

    expect(facts).toEqual([{ type: "locked", reason: "auto_lock" }])
  })
})
