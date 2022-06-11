import { db } from "@core/libs/dexieDb"
import { CustomErc20Token } from "@core/types"
import { useLiveQuery } from "dexie-react-hooks"

export const useCustomErc20Token = (id: string | undefined) => {
  return useLiveQuery<CustomErc20Token | undefined>(async () => {
    const token = id !== undefined ? await db.tokens.get(id) : undefined
    if (token?.type === "erc20" && "isCustom" in token) {
      const customToken = token as CustomErc20Token
      if (customToken.isCustom) return token
    }
    return undefined
  }, [])
}
