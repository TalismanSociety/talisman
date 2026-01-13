// biome-ignore lint/suspicious/noExplicitAny: legacy
export const isPromise = <T = any>(value: any): value is Promise<T> =>
  !!value &&
  (typeof value === "object" || typeof value === "function") &&
  typeof value.then === "function"
