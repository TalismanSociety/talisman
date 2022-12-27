import { chaindataProvider } from "@core/rpcs/chaindata"
import { TokenId } from "@talismn/chaindata-provider"
import { useLiveQuery } from "dexie-react-hooks"

export const useCustomErc20Token = (id: TokenId | undefined) =>
  useLiveQuery(async () => {
    if (id === undefined) return

    const token = await chaindataProvider.getToken(id)

    // token doesn't exist
    if (!token) return

    // token is not custom
    if (!("isCustom" in token)) return
    if (!token.isCustom) return

    // token is not an evm erc20
    if (token.type !== "evm-erc20") return

    return token
  }, [id])
