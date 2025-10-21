import { Token, TokenSchema } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, map, pairwise, ReplaySubject } from "rxjs"

import { getBlobStore } from "../../db"

const blobStore = getBlobStore<Token[]>("dynamic-tokens")

const normalizeDynamicTokens = (tokens: Token[] | null | undefined): Token[] => {
  if (!tokens) return []
  return tokens
    .filter((t) => TokenSchema.safeParse(t).success)
    .sort((a, b) => a.id.localeCompare(b.id))
}

const getStore = () => {
  const subject = new ReplaySubject<Token[]>(1)

  // load initial data
  blobStore
    .get()
    .then((tokens) => {
      subject.next(normalizeDynamicTokens(tokens))
    })
    .catch((error) => {
      log.error("[dynamicTokens] failed to load dynamicTokens store on startup", error)
      subject.next([])
    })

  // persist changes (this never unsubscribes)
  subject
    .pipe(debounceTime(500), map(normalizeDynamicTokens), pairwise())
    .subscribe(([previousTokens, currentTokens]) => {
      // Compare previousTokens with currentTokens
      if (!isEqual(previousTokens, currentTokens)) {
        log.debug(
          `[dynamicTokens] updating storage previous:${previousTokens.length} new:${currentTokens.length}`,
        )
        blobStore.set(currentTokens)
      }
    })

  return subject
}

export const dynamicTokensStore$ = getStore()
