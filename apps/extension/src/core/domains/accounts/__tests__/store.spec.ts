import seedPhraseStore from "../store"

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
})
