import { z } from "zod"

const STORAGE_KEY = "blockaidSiteScanQuota"
const MAX_SCANS_PER_MINUTE = 10
const MAX_SCANS_PER_DAY = 100
const MINUTE = 60_000

const quotaSchema = z.object({
  day: z.string(),
  scansToday: z.number().int().nonnegative(),
  recentScans: z.array(z.number().finite()),
})
type Quota = z.infer<typeof quotaSchema>

let storedQuota: Promise<Quota> | undefined

async function loadQuota(): Promise<Quota> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  const parsed = quotaSchema.safeParse(stored[STORAGE_KEY])
  return parsed.success ? parsed.data : { day: "", scansToday: 0, recentScans: [] }
}

/** The quota is persisted so that a service worker restart does not reset it. */
export async function tryConsumeScanQuota(): Promise<boolean> {
  storedQuota ??= loadQuota()
  const quota = await storedQuota

  const now = Date.now()
  const today = new Date(now).toISOString().slice(0, 10)
  if (quota.day !== today) {
    quota.day = today
    quota.scansToday = 0
  }
  quota.recentScans = quota.recentScans.filter((time) => time > now - MINUTE)

  if (quota.scansToday >= MAX_SCANS_PER_DAY) return false
  if (quota.recentScans.length >= MAX_SCANS_PER_MINUTE) return false

  quota.scansToday++
  quota.recentScans.push(now)
  await chrome.storage.local.set({ [STORAGE_KEY]: quota })
  return true
}
