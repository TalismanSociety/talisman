import { TokenId } from "@talismn/chaindata-provider"
import { useAtomValue } from "jotai"
import { useMemo } from "react"

import { remoteConfigAtom } from "@ui/atoms/remoteConfig"
import useToken from "@ui/hooks/useToken"

export const useCanStakeInNomPool = (tokenId: TokenId | null | undefined) => {
  const token = useToken(tokenId)
  const remoteConfig = useAtomValue(remoteConfigAtom)

  return useMemo(
    () =>
      token?.type === "substrate-native" && !!remoteConfig.nominationPools[token.chain.id]?.length,
    [token, remoteConfig]
  )
}
