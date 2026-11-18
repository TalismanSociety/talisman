import type { TokenId } from "@talismn/chaindata-provider"
import { getAccountsByCategory$ } from "@ui/state/accounts"
import { getBalances$ } from "@ui/state/balances"
import { firstValueFrom } from "rxjs"
import type { IntermediateCandidate } from "../swap-modules/hops"

export const getIntermediateCandidates = async (hub: TokenId): Promise<IntermediateCandidate[]> => {
  const [accounts, balances] = await Promise.all([
    firstValueFrom(getAccountsByCategory$("owned")),
    firstValueFrom(getBalances$("owned")),
  ])

  return accounts.map((account) => ({
    address: account.address,
    type: account.type,
    hubBalance:
      balances.find({ address: account.address, tokenId: hub }).each[0]?.transferable?.planck ?? 0n,
  }))
}
