import { parseTokenId, TokenId, TokenType } from "@talismn/chaindata-provider"
import { isEqual } from "lodash-es"
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs"

const tokenIdsByAddress = new BehaviorSubject<Record<string, TokenId[]>>({})

export const setDetectedTokenIds = (address: string, type: TokenType, tokenIds: TokenId[]) => {
  // keep token ids from other token types (will be useful once we add token2022)
  const otherTokens =
    tokenIdsByAddress.value[address]?.filter((id) => parseTokenId(id).type !== type) ?? []

  tokenIdsByAddress.next({
    ...tokenIdsByAddress.value,
    [address]: otherTokens.concat(tokenIds).sort(),
  })
}

export const getDetectedTokensIds$ = (address: string) =>
  tokenIdsByAddress.pipe(
    map((ownedTokens) => ownedTokens[address] ?? []),
    distinctUntilChanged<TokenId[]>(isEqual),
  )
