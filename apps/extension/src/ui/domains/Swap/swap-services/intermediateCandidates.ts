import { db } from "@core/db"
import type { IntermediateCandidate } from "@core/domains/swaps/hops"
import type { TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual, isEthereumAddress } from "@talismn/crypto"
import { getAccountsByCategory$ } from "@ui/state/accounts"
import { getBalances$ } from "@ui/state/balances"
import { firstValueFrom } from "rxjs"

/** the owned EVM accounts, with their hub balance and whether a started swap plan already holds them */
export const getIntermediateCandidates = async (hub: TokenId): Promise<IntermediateCandidate[]> => {
  const [accounts, balances, livePlans] = await Promise.all([
    firstValueFrom(getAccountsByCategory$("owned")),
    firstValueFrom(getBalances$("owned")),
    db.swapPlans.where("phase").anyOf("running", "paused").toArray(),
  ])

  return accounts
    .filter((account) => isEthereumAddress(account.address))
    .map((account) => ({
      address: account.address,
      type: account.type,
      hubBalance:
        balances.find({ address: account.address, tokenId: hub }).each[0]?.transferable?.planck ??
        0n,
      busy: livePlans.some((plan) => isAddressEqual(plan.intermediate, account.address)),
    }))
}
