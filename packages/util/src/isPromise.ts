// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isPromise = <T = any>(value: any): value is Promise<T> =>
  !!value &&
  (typeof value === "object" || typeof value === "function") &&
  typeof value.then === "function"
