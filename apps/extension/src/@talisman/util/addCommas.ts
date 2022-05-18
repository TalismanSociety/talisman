const addCommas = (number: number | string): string => {
  return number.toLocaleString("en-US")
  //return new Intl.NumberFormat('en-US').format(typeof number === 'string' ? parseInt(number, 10) : number)
}

export default addCommas
