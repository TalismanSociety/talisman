/*
// provides an estimate rounded to the nearest first integer
// ie 18.25 => 20, 3250465.242452 => 3000000
*/
export const roundToFirstInteger = (value: number) => {
  const intLength = value.toFixed(0).length
  return Number(value.toPrecision(intLength - (intLength - 1)))
}
