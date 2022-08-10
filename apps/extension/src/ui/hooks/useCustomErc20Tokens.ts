import { CustomErc20Token } from "@core/domains/tokens/types"
import { db } from "@core/libs/db"
import { useLiveQuery } from "dexie-react-hooks"

export const useCustomErc20Tokens = () => {
  return useLiveQuery<CustomErc20Token[]>(
    async () =>
      (await db.tokens.toArray()).filter<CustomErc20Token>(
        (token): token is CustomErc20Token =>
          token.type === "evm-erc20" && "isCustom" in token && token.isCustom
      ),
    []
  )
}
