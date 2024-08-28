import { Token, TokenId } from "@talismn/chaindata-provider"
import { BalanceFormatter } from "extension-core"
import { useMemo } from "react"

import useToken from "@ui/hooks/useToken"

export const useExistentialDeposit = (tokenId: TokenId | null | undefined) => {
  const token = useToken(tokenId) as Token

  const plancks = useMemo(() => {
    if (!token) return null
    switch (token.type) {
      case "substrate-assets":
      case "substrate-equilibrium":
      case "substrate-foreignassets":
      case "substrate-native":
      case "substrate-psp22":
      case "substrate-tokens":
        return BigInt(token.existentialDeposit ?? "0")

      default:
        return 0n
    }
  }, [token])

  return useMemo(() => {
    if (!token || typeof plancks !== "bigint") return null
    return new BalanceFormatter(plancks, token.decimals)
  }, [token, plancks])
}
