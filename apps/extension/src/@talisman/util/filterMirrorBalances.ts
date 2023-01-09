import { Balance } from "@core/domains/balances"

export const filterMirrorTokens = (balance: Balance, i: number, balances: Balance[]) => {
  const mirrorOf = (balance.token as any).mirrorOf as string
  return !mirrorOf || !balances.find((b) => b.tokenId === mirrorOf)
}
