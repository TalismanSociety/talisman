import { CustomErc20Token } from "@core/types"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@core/libs/db"

export const useCustomErc20Tokens = () => {
  return useLiveQuery<CustomErc20Token[]>(
    async () =>
      (await db.tokens.toArray()).filter<CustomErc20Token>(
        (token): token is CustomErc20Token =>
          token.type === "erc20" && "isCustom" in token && token.isCustom
      ),
    []
  )
}
