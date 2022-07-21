export const sortBig = (desc?: boolean) => (a: bigint, b: bigint) => {
  const sortAscending = (v1: bigint, v2: bigint) => (v1 < v2 ? -1 : v1 > v2 ? 1 : 0)
  return desc ? sortAscending(b, a) : sortAscending(a, b)
}

// TODO how to enforce condition on T so that T[property] is a bigint ?
export const sortBigBy =
  <T>(property: keyof T, desc?: boolean) =>
  (a: T, b: T) => {
    const v1 = a[property] as unknown as bigint
    const v2 = b[property] as unknown as bigint
    return sortBig(desc)(v1, v2)
  }
