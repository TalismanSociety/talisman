const getDerivationPathFromPattern = (index = 0, pattern: string) =>
  pattern.replace("INDEX", index.toString())

export const getSolLedgerDerivationPath = (index = 0) => {
  return getDerivationPathFromPattern(index, `44'/501'/INDEX'/0'`)
}
