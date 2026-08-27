import { log } from "@common/log"
import type { Account } from "@core/domains/keyring/exports"
import { type Address, Balances } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { getAccountPlatformFromAddress } from "@talismn/crypto"
import { api } from "@ui/api"
import { useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useToken } from "@ui/state/chaindata"
import { isTransferableToken } from "@ui/util/isTransferableToken"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

// compare by account platform, not raw encoding: a bitcoin account identity is an
// xpub (bip32-xpub) while a recipient is an on-chain address (bech32/base58) — both
// belong to the bitcoin platform and are therefore compatible
const isCompatibleAddress = (from: Address, to: Address) => {
  try {
    return getAccountPlatformFromAddress(from) === getAccountPlatformFromAddress(to)
  } catch (err) {
    log.error("Error detecting address platform", { from, to, err })
    return false
  }
}

export const useSendFundsPopup = (
  account: Account | null | undefined,
  tokenId?: TokenId,
  tokenSymbol?: string,
  to?: Address
) => {
  const { t } = useTranslation()
  const token = useToken(tokenId)
  const accounts = useAccounts("owned")
  const balances = useBalances("owned")
  const transferableBalance = useMemo(() => {
    const owned = new Balances(balances.each.filter((b) => !tokenId || b.tokenId === tokenId))
    return owned.sum.planck.transferable
  }, [balances, tokenId])

  const { canSendFunds, cannotSendFundsReason } = useMemo<{
    canSendFunds: boolean
    cannotSendFundsReason?: string
  }>(() => {
    if (account?.type === "watch-only")
      return {
        canSendFunds: false,
        cannotSendFundsReason: t("Watched accounts cannot send funds"),
      }

    if (account?.type === "signet")
      return {
        canSendFunds: false,
        cannotSendFundsReason: t(`Please send funds on Signet: ${account.url}`),
      }
    if (tokenId && transferableBalance === 0n)
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
    if (token && !isTransferableToken(token))
      return { canSendFunds: false, cannotSendFundsReason: t("This token is not transferable") }
    return { canSendFunds: true }
  }, [account, accounts, t, to, tokenId, transferableBalance, token])

  const openSendFundsPopup = useCallback(() => {
    if (!canSendFunds) return
    api.sendFundsOpen({ from: account?.address, tokenId, tokenSymbol, to })
  }, [account?.address, canSendFunds, to, tokenId, tokenSymbol])

  return { canSendFunds, cannotSendFundsReason, openSendFundsPopup }
}
