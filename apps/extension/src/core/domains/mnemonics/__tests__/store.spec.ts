import { seedPhraseStore } from "../store"

describe("createSeedPhraseStore", () => {
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
    const stored = await seedPhraseStore.get(id)
    const storedCipher = stored.cipher
    expect(storedCipher).toBeDefined()
    const storedConfirmed = stored.confirmed
    expect(storedConfirmed).toBeDefined()
    expect(storedConfirmed).toBe(false)

    const storedSeed = await seedPhraseStore.getSeed(id, password)
    expect(storedSeed.ok).toBe(true)
    expect(storedSeed.val).toBe(seed)

    const badSeed = await seedPhraseStore.getSeed(id, "badPassword")
    expect(badSeed.err).toBe(true)
    expect(badSeed.val).toBe("Incorrect password")
  })
})
