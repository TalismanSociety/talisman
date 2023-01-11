import BigNumber from "bignumber.js"

const sortAscending = (v1: BigNumber, v2: BigNumber) => (v1.lt(v2) ? -1 : v1.gt(v2) ? 1 : 0)

export const sortBig = (desc?: boolean) => (a: BigNumber, b: BigNumber) =>
  desc ? sortAscending(b, a) : sortAscending(a, b)

export const sortBigBy =
  <K extends string>(property: K, desc?: boolean) =>
  <T extends Record<K, BigNumber>, U extends Record<K, BigNumber>>(a: T, b: U) => {
    const v1 = a[property]
    const v2 = b[property]
    return sortBig(desc)(v1, v2)
  }
