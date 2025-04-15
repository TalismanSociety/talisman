/**
 * WARNING: This function only checks against null or undefined, it does not coerce the value.
 * ie: false and 0 are considered not nil
 * Use isTruthy instead for a regular coercion check.
 *
 * @param value
 * @returns whether the value is neither null nor undefined
 */
export const isNotNil = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined
