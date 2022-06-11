import { db } from "@core/libs/dexieDb"
import { useLiveQuery } from "dexie-react-hooks"

export const useCustomErc20Token = (id: string | undefined) => {
  return useLiveQuery(async () => {
    const token = id !== undefined ? await db.tokens.get(id) : undefined
    return token?.type === "erc20" && token.isCustom ? token : undefined
  }, [])
}
