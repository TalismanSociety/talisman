import { LEGACY_SEED_PREFIX, LegacySeedObj, decryptLegacyMnemonicObject } from "../legacy/helpers"
import { createLegacySeedPhraseStore } from "../legacy/store"

describe("createLegacySeedPhraseStore", () => {
  it("should be defined", () => {
    expect(createLegacySeedPhraseStore).toBeDefined()
  })

  describe("add", () => {
    const seedPhraseStore = createLegacySeedPhraseStore()

    it("should be defined", () => {
      expect(seedPhraseStore.add).toBeDefined()
    })
  })
})

describe("decryptLegacyMnemonicObject", () => {
  it("should be defined", () => {
    expect(decryptLegacyMnemonicObject).toBeDefined()
  })

  test("should unpack a legacy seed", () => {
    const seed = "dove lumber quote board young robust kit invite plastic regular skull history"
    const legacySeed: LegacySeedObj = { seed: `${LEGACY_SEED_PREFIX}${seed}` }
    const result = decryptLegacyMnemonicObject(legacySeed)
    expect(result.ok).toBe(true)
    expect(result.val).toBe(seed)
  })
})
