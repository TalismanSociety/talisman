export const sortBig = (desc?: boolean) => (a: bigint, b: bigint) => {
  const sortAscending = (v1: bigint, v2: bigint) => (v1 < v2 ? -1 : v1 > v2 ? 1 : 0)
  return desc ? sortAscending(b, a) : sortAscending(a, b)
}

export const sortBigBy =
  <K extends string>(property: K, desc?: boolean) =>
  <T extends Record<K, bigint>, U extends Record<K, bigint>>(a: T, b: U) => {
    const v1 = a[property]
    const v2 = b[property]
    return sortBig(desc)(v1, v2)
  }
