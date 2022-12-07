export function isArrayOf<T, P extends Array<unknown>>(
  array: unknown[],
  func: new (...args: P) => T
): array is T[] {
  if (array.length > 0 && array[0] instanceof func) return true
  return false
}
