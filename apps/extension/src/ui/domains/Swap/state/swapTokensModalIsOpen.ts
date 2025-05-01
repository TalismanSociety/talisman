import { state } from "@react-rxjs/core"
import { firstValueFrom, map } from "rxjs"

import { searchParams$, setSearchParams } from "./searchParams"

export const swapTokensModalIsOpen$ = state(
  searchParams$.pipe(map((params) => params.has("swapTokens"))),
)

export const setSwapTokensModalIsOpen = async (isOpen?: boolean) => {
  const searchParams = await firstValueFrom(searchParams$)

  if (isOpen) searchParams.set("swapTokens", "open")
  else searchParams.delete("swapTokens")

  setSearchParams(searchParams)
}
