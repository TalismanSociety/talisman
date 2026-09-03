// beyond this the timestamp is out of range for a javascript date: the permission never expires
const MAX_DATE_SECONDS = 8_640_000_000_000n

// a permission that outlives the token approval it grants is as good as permanent, so anything
// beyond a year is worth flagging even though it does carry a deadline
const FAR_FUTURE_SECONDS = 365n * 24n * 60n * 60n

export type ExpiryInfo = {
  date: Date | null
  isPermanent: boolean
  isFarFuture: boolean
}

export const getExpiryInfo = (expiry: bigint | undefined, now = Date.now()): ExpiryInfo => {
  if (expiry === undefined || expiry >= MAX_DATE_SECONDS)
    return { date: null, isPermanent: true, isFarFuture: true }

  return {
    date: new Date(Number(expiry) * 1000),
    isPermanent: false,
    isFarFuture: expiry - BigInt(Math.floor(now / 1000)) > FAR_FUTURE_SECONDS,
  }
}
