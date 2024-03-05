import { isEthereumAddress } from "@talismn/util"
import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { AccountJsonDcent } from "extension-core"
import { AssetDiscoveryMode } from "extension-core"
import { useCallback, useMemo } from "react"

import { DcentAccountInfo } from "./util"

type DcentAccountStatus = "not-connected" | "update-required" | "connected"

export const useDcentAccountConnect = (accountInfo: DcentAccountInfo, address: string) => {
  // origin check in case a same seed is used accross multiple device, it would crash the screen if type isn't AccountJsonDcent
  const accountUnsafe = useAccountByAddress(address)
  const account = useMemo(
    () => (accountUnsafe?.origin === "DCENT" ? (accountUnsafe as AccountJsonDcent) : undefined),
    [accountUnsafe]
  )

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
    async (name: string) => {
      const addedAddress = await api.accountCreateDcent(
        name,
        address,
        isEthereumAddress(address) ? "ethereum" : "ed25519",
        accountInfo.derivationPath,
        Object.values(accountInfo.tokens).map((t) => t.id)
      )
      api.assetDiscoveryStartScan(AssetDiscoveryMode.ACTIVE_NETWORKS, [addedAddress])

      return addedAddress
    },

    [accountInfo.derivationPath, accountInfo.tokens, address]
  )

  return { account, isConnected, isUpdateRequired, status, connect }
}
