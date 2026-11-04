import type { TokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { getAccountsByCategory$ } from "@ui/state/accounts"
import { getBalances$ } from "@ui/state/balances"
import { firstValueFrom } from "rxjs"
import type { IntermediateCandidate } from "../swap-modules/hops"

/** the owned EVM accounts, with their hub balance */
export const getIntermediateCandidates = async (hub: TokenId): Promise<IntermediateCandidate[]> => {
  const [accounts, balances] = await Promise.all([
    firstValueFrom(getAccountsByCategory$("owned")),
    firstValueFrom(getBalances$("owned")),
  ])

  return accounts
    .filter((account) => isEthereumAddress(account.address))
    .map((account) => ({
      address: account.address,
      type: account.type,
      hubBalance:
        balances.find({ address: account.address, tokenId: hub }).each[0]?.transferable?.planck ??
        0n,
    }))
}
