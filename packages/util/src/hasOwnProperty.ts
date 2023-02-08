export function hasOwnProperty<X, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  if (typeof obj !== "object") return false
  if (obj === null) return false
  return prop in obj
}
