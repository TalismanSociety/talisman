import { TokenId } from "@talismn/chaindata-provider"
import { ZapFastIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Balances } from "extension-core"
import { log } from "extension-shared"
import { useAtomValue } from "jotai"
import { FC, MouseEventHandler, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { remoteConfigAtom } from "@ui/atoms/remoteConfig"
import useAccounts from "@ui/hooks/useAccounts"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useToken from "@ui/hooks/useToken"

import { useNomPoolBondModal } from "./useNomPoolBondModal"

export const NomPoolBondPillButton: FC<{
  tokenId: TokenId
  balances: Balances
  className?: string
}> = ({ tokenId, balances, className }) => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const ownedAccounts = useAccounts("owned")
  const token = useToken(tokenId)
  const remoteConfig = useAtomValue(remoteConfigAtom)
  const { open } = useNomPoolBondModal()

  const openArgs = useMemo(() => {
    if (!balances || !token?.chain) return
    try {
      let poolId = remoteConfig.nominationPools[token.chain.id]?.[0]
      if (!poolId) return

      const ownedAddresses = ownedAccounts.map(({ address }) => address)

      const sorted = balances
        .find({ tokenId })
        .each.filter((b) => ownedAddresses.includes(b.address))
        .sort((a, b) => {
          if (a.transferable.planck === b.transferable.planck) return 0
          return a.transferable.planck > b.transferable.planck ? -1 : 1
        })

      const address = sorted[0].address

      // lookup existing poolId for that account
      for (const balance of sorted.filter((b) => b.address === address)) {
        type Meta = { poolId?: number }
        const pool = balance.nompools.find((np) => (np.meta as Meta).poolId === poolId)
        const meta = pool?.meta as Meta | undefined
        if (meta?.poolId) {
          poolId = meta.poolId
          break
        }
      }

      return { tokenId, address, poolId }
    } catch (err) {
      log.error("Failed to compute staking modal open args", err)
    }

    return null
  }, [balances, ownedAccounts, remoteConfig.nominationPools, token?.chain, tokenId])

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      if (!openArgs) return

      e.stopPropagation()

      open(openArgs)
      genericEvent("open inline staking modal", { tokenId: openArgs.tokenId, from: "portfolio" })
    },
    [genericEvent, open, openArgs]
  )

  if (!openArgs) return null

  return (
    <button
      className={classNames(
        "bg-primary/10 hover:bg-primary/20 text-primary inline-flex h-full items-center gap-2 rounded px-3 py-1 text-xs",
        className
      )}
      type="button"
      onClick={handleClick}
    >
      <ZapFastIcon className="shrink-0" />
      <div>{t("Stake")}</div>
    </button>
  )
}
