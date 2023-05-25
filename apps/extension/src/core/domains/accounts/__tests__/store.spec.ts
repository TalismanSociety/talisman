import { encrypt } from "@metamask/browser-passworder"

import seedPhraseStore, { LEGACY_SEED_PREFIX, LegacySeedObj, legacyUnpackSeed } from "../store"

describe("seedPhraseStore", () => {
  it("should be defined", () => {
    expect(seedPhraseStore).toBeDefined()
  })

  describe("add", () => {
    it("should be defined", () => {
      expect(seedPhraseStore.add).toBeDefined()
    })
  })

  test("calling add should result in the cipher being stored", async () => {
    const seed = "dove lumber quote board young robust kit invite plastic regular skull history"
    const password = "password"
    const address = "5Fj8Z2J9Z9"
    const result = await seedPhraseStore.add(seed, address, password)
    const { ok, val } = result
    expect(ok).toBe(true)
    expect(val).toBe(true)
    const storedCipher = await seedPhraseStore.get("cipher")
    expect(storedCipher).toBeDefined()
    const storedAddress = await seedPhraseStore.get("address")
    expect(storedAddress).toBeDefined()
    expect(storedAddress).toBe(address)
    const storedConfirmed = await seedPhraseStore.get("confirmed")
    expect(storedConfirmed).toBeDefined()
    expect(storedConfirmed).toBe(false)

    const storedSeed = await seedPhraseStore.getSeed(password)
    expect(storedSeed.ok).toBe(true)
    expect(storedSeed.val).toBe(seed)

    const badSeed = await seedPhraseStore.getSeed("badPassword")
    expect(badSeed.err).toBe(true)
    expect(badSeed.val).toBe("Incorrect password")
  })

  test("calling getSeed with a legacy seed should return the seed", async () => {
    const seed = "dove lumber quote board young robust kit invite plastic regular skull history"
    const legacySeed: LegacySeedObj = { seed: `${LEGACY_SEED_PREFIX}${seed}` }
    const password = "password"
    const address = "5Fj8Z2J9Z9"
    const cipher = await encrypt(password, legacySeed)
    await seedPhraseStore.set({ cipher, address })
    const result = await seedPhraseStore.getSeed(password)
    const { ok, val } = result
    expect(ok).toBe(true)
    expect(val).toBe(seed)
  })
})

describe("legacyUnpackSeed", () => {
  it("should be defined", () => {
    expect(legacyUnpackSeed).toBeDefined()
  })

  test("should unpack a legacy seed", () => {
    const seed = "dove lumber quote board young robust kit invite plastic regular skull history"
    const legacySeed: LegacySeedObj = { seed: `${LEGACY_SEED_PREFIX}${seed}` }
    const result = legacyUnpackSeed(legacySeed)
    expect(result.ok).toBe(true)
    expect(result.val).toBe(seed)
  })
})
