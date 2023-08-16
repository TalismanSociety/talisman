import { LEGACY_SEED_PREFIX, LegacySeedObj, legacyDecryptSeed } from "../legacy/helpers"
import { seedPhraseStore } from "../store"

describe("createLegacySeedPhraseStore", () => {
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
    const result = await seedPhraseStore.add("Test Seed", seed, password)
    const { ok, val: id } = result
    expect(ok).toBe(true)
    expect(typeof id === "string").toBe(true)
    const storedCipher = await seedPhraseStore.get("cipher")
    expect(storedCipher).toBeDefined()
    const storedConfirmed = await seedPhraseStore.get("confirmed")
    expect(storedConfirmed).toBeDefined()
    expect(storedConfirmed).toBe(false)

    const storedSeed = await seedPhraseStore.getSeed(id, password)
    expect(storedSeed.ok).toBe(true)
    expect(storedSeed.val).toBe(seed)

    const badSeed = await seedPhraseStore.getSeed(id, "badPassword")
    expect(badSeed.err).toBe(true)
    expect(badSeed.val).toBe("Incorrect password")
  })

  test("calling getSeed with a legacy seed should return the seed", async () => {
    const seed = "dove lumber quote board young robust kit invite plastic regular skull history"
    const legacySeed: LegacySeedObj = { seed: `${LEGACY_SEED_PREFIX}${seed}` }
    const password = "password"
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- this is to enable storing an object instead of a string
    // @ts-ignore
    const id = await seedPhraseStore.add("Test Legacy Seed", legacySeed, password, "legacy", true)
    const result = await seedPhraseStore.getSeed(id.val, password)
    const { ok, val } = result
    expect(ok).toBe(true)
    expect(val).toBe(seed)
  })
})

describe("legacyDecryptSeed", () => {
  it("should be defined", () => {
    expect(legacyDecryptSeed).toBeDefined()
  })

  test("should unpack a legacy seed", () => {
    const seed = "dove lumber quote board young robust kit invite plastic regular skull history"
    const legacySeed: LegacySeedObj = { seed: `${LEGACY_SEED_PREFIX}${seed}` }
    const result = legacyDecryptSeed(legacySeed)
    expect(result.ok).toBe(true)
    expect(result.val).toBe(seed)
  })
})
