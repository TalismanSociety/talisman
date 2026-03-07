const SOLANA_DERIVATION_PATH_PATTERNS = {
  "ledger-live": `44'/501'/INDEX'`,
  "classic": `44'/501'/INDEX'/0'`,
}

export type LedgerSolDerivationPathType = keyof typeof SOLANA_DERIVATION_PATH_PATTERNS

const getDerivationPathFromPattern = (pattern: string, index = 0) =>
  pattern.replace("INDEX", index.toString())

export const getSolLedgerDerivationPath = (type: LedgerSolDerivationPathType, index = 0) => {
  return getDerivationPathFromPattern(SOLANA_DERIVATION_PATH_PATTERNS[type], index)
}
