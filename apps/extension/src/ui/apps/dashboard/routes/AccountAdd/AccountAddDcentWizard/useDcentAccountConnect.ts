import { AccountJsonDcent } from "@core/domains/accounts/types"
import { isEthereumAddress } from "@talismn/util"
import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useCallback, useMemo } from "react"

import { DcentAccountInfo } from "./util"

type DcentAccountStatus = "not-connected" | "update-required" | "connected"

export const useDcentAccountConnect = (accountInfo: DcentAccountInfo, address: string) => {
  const account = useAccountByAddress(address) as AccountJsonDcent | undefined

  const { isConnected, isUpdateRequired } = useMemo(
    () =>
      account
        ? {
            isConnected: true,
            isUpdateRequired:
              account.tokenIds.sort().join("|") !==
              Object.values(accountInfo.tokens)
                .map((t) => t.id)
                .sort()
                .join("|"),
          }
        : { isConnected: false, isUpdateRequired: false },
    [account, accountInfo.tokens]
  )

  const status = useMemo<DcentAccountStatus>(() => {
    if (!isConnected) return "not-connected"
    return isUpdateRequired ? "update-required" : "connected"
  }, [isConnected, isUpdateRequired])

  const connect = useCallback(
    (name: string) =>
      api.accountCreateDcent(
        name,
        address,
        isEthereumAddress(address) ? "ethereum" : "ed25519",
        accountInfo.derivationPath,
        Object.values(accountInfo.tokens).map((t) => t.id)
      ),
    [accountInfo.derivationPath, accountInfo.tokens, address]
  )

  return { account, isConnected, isUpdateRequired, status, connect }
}
