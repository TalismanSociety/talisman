import { AccountJsonAny, AccountType } from "@extension/core"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { Address, Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import useAccounts from "./useAccounts"
import useBalances from "./useBalances"

const isCompatibleAddress = (from: Address, to: Address) => {
  // in the future there might be other account types, for now only ethereum is specific
  return isEthereumAddress(from) === isEthereumAddress(to)
}

export const useSendFundsPopup = (
  account: AccountJsonAny | undefined,
  tokenId?: TokenId,
  tokenSymbol?: string,
  to?: Address
) => {
  const { t } = useTranslation()
  const accounts = useAccounts("owned")
  const balances = useBalances("owned")
  const transferableBalances = useMemo(
    () => new Balances(balances.each.filter((b) => !tokenId || b.tokenId === tokenId)),
    [balances, tokenId]
  )

  const { canSendFunds, cannotSendFundsReason } = useMemo<{
    canSendFunds: boolean
    cannotSendFundsReason?: string
  }>(() => {
    if (account?.origin === "WATCHED")
      return {
        canSendFunds: false,
        cannotSendFundsReason: t("Watched accounts cannot send funds"),
      }
    if (account?.origin === AccountType.Dcent)
      return {
        canSendFunds: false,
        cannotSendFundsReason: t("D'CENT accounts cannot send funds"),
      }
    if (account?.origin === "SIGNET")
      return {
        canSendFunds: false,
        cannotSendFundsReason: t(`Please send funds on Signet: ${account.signetUrl}`),
      }
    if (tokenId && transferableBalances.sum.planck.transferable === 0n)
      return {
        canSendFunds: false,
        cannotSendFundsReason: t("No tokens available to send"),
      }
    if (accounts.length === 0) {
      return {
        canSendFunds: false,
        cannotSendFundsReason: t("No accounts available"),
      }
    }
    if (to) {
      if (account && !isCompatibleAddress(account.address, to))
        return {
          canSendFunds: false,
          cannotSendFundsReason: t("Incompatible address types"),
        }
      if (!account && !accounts.some((a) => isCompatibleAddress(a.address, to)))
        return {
          canSendFunds: false,
          cannotSendFundsReason: t("None of your accounts can send funds to this address"),
        }
    }
    return { canSendFunds: true }
  }, [account, accounts, t, to, tokenId, transferableBalances.sum.planck.transferable])

  const openSendFundsPopup = useCallback(() => {
    if (!canSendFunds) return
    api.sendFundsOpen({ from: account?.address, tokenId, tokenSymbol, to })
  }, [account?.address, canSendFunds, to, tokenId, tokenSymbol])

  return { canSendFunds, cannotSendFundsReason, openSendFundsPopup }
}
