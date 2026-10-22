import { describe, expect, test } from "vitest"
import {
  decryptLegacyMnemonicObject,
  LEGACY_SEED_PREFIX,
  type LegacySeedObj,
} from "../legacy/helpers"

describe("decryptLegacyMnemonicObject", () => {
  test("should unpack a legacy seed", () => {
    const seed = "dove lumber quote board young robust kit invite plastic regular skull history"
    const legacySeed: LegacySeedObj = { seed: `${LEGACY_SEED_PREFIX}${seed}` }
    const result = decryptLegacyMnemonicObject(legacySeed)
    expect(result.ok).toBe(true)
    expect(result.val).toBe(seed)
  })
})
