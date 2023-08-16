import { Err, Ok, Result } from "ts-results"

type LEGACY_SEED_PREFIX = "----"
export const LEGACY_SEED_PREFIX = "----"

export type LegacySeedObj = {
  seed: `${LEGACY_SEED_PREFIX}${string}`
}

export type SeedPhraseData = {
  cipher?: string
  confirmed: boolean
}

export const legacyDecryptSeed = ({
  seed,
}: LegacySeedObj): Result<string, "Unable to decrypt seed"> => {
  if (!seed.startsWith(LEGACY_SEED_PREFIX)) return Err("Unable to decrypt seed")
  const seedString = seed.split(LEGACY_SEED_PREFIX)[1]
  return Ok(seedString)
}
