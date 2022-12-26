import { CustomErc20Token } from "@core/domains/tokens/types"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { useLiveQuery } from "dexie-react-hooks"

export const useCustomErc20Tokens = () =>
  useLiveQuery(async () => {
    const tokens = await chaindataProvider.tokens()

    return Object.values(tokens).filter((token): token is CustomErc20Token => {
      // token is not custom
      if (!("isCustom" in token)) return false
      if (!token.isCustom) return false

      // token is not an evm erc20
      if (token.type !== "evm-erc20") return false

      return true
    })
  }, [])
