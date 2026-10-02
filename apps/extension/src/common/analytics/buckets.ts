export const AMOUNT_BUCKETS = [
  "0",
  "<10",
  "10-100",
  "100-1k",
  "1k-10k",
  "10k-100k",
  "100k-1M",
  "1M-10M",
  "10M-100M",
  ">100M",
] as const
export type AmountBucket = (typeof AMOUNT_BUCKETS)[number]

const AMOUNT_UPPER_BOUNDS: readonly [number, AmountBucket][] = [
  [10, "<10"],
  [100, "10-100"],
  [1_000, "100-1k"],
  [10_000, "1k-10k"],
  [100_000, "10k-100k"],
  [1_000_000, "100k-1M"],
  [10_000_000, "1M-10M"],
  [100_000_000, "10M-100M"],
]

export const toAmountBucket = (fiat: number | null | undefined): AmountBucket => {
  if (fiat == null || !Number.isFinite(fiat) || fiat <= 0) return "0"
  return AMOUNT_UPPER_BOUNDS.find(([bound]) => fiat < bound)?.[1] ?? ">100M"
}

export const SHARE_BUCKETS = ["0", "<10%", "10-25%", "25-50%", "50-75%", "75-100%"] as const
export type ShareBucket = (typeof SHARE_BUCKETS)[number]

const SHARE_UPPER_BOUNDS: readonly [number, ShareBucket][] = [
  [0.1, "<10%"],
  [0.25, "10-25%"],
  [0.5, "25-50%"],
  [0.75, "50-75%"],
]

export const toShareBucket = (part: number, whole: number): ShareBucket => {
  if (!(whole > 0) || !(part > 0)) return "0"
  const share = part / whole
  return SHARE_UPPER_BOUNDS.find(([bound]) => share < bound)?.[1] ?? "75-100%"
}

export const DAY_BUCKETS = ["0", "1-6", "7-29", "30-89", "90-364", "365+", "unknown"] as const
export type DayBucket = (typeof DAY_BUCKETS)[number]

const DAY_MS = 24 * 60 * 60_000

const DAY_UPPER_BOUNDS: readonly [number, DayBucket][] = [
  [1, "0"],
  [7, "1-6"],
  [30, "7-29"],
  [90, "30-89"],
  [365, "90-364"],
]

export const toDayBucket = (since: number | null, now: number): DayBucket => {
  if (since === null || since > now) return "unknown"
  const days = Math.floor((now - since) / DAY_MS)
  return DAY_UPPER_BOUNDS.find(([bound]) => days < bound)?.[1] ?? "365+"
}
