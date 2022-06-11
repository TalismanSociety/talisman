import { Erc20Token } from "@core/types"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@core/libs/dexieDb"

export const useCustomErc20Tokens = () => {
  return useLiveQuery(
    async () =>
      (await db.tokens.toArray()).filter(
        (token): token is Erc20Token => token.type === "erc20" && !!token.isCustom
      ),
    []
  )
}
