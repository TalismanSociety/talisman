import { AccountJsonAny } from "@extension/core"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

export const useAccountToggleIsPortfolio = (account?: AccountJsonAny) => {
  const { t } = useTranslation()

  const { canToggleIsPortfolio, toggleLabel } = useMemo(
    () => ({
      canToggleIsPortfolio: account?.origin === "WATCHED",
      toggleLabel: account?.isPortfolio ? t("Make followed-only account") : t("Add to portfolio"),
    }),
    [account, t]
  )

  const toggleIsPortfolio = useCallback(async () => {
    if (!account) return

    const isPortfolio = !!account?.isPortfolio

    const notificationId = notify(
      {
        type: "processing",
        title: t("Please wait"),
        subtitle: isPortfolio ? t(`Removing from portfolio`) : t("Adding to portfolio"),
      },
      { autoClose: false }
    )

    try {
      await api.accountExternalSetIsPortfolio(account.address, !isPortfolio)
      notifyUpdate(notificationId, {
        type: "success",
        title: t("Success"),
        subtitle: isPortfolio ? t(`Removed from portfolio`) : t("Added to portfolio"),
      })
      return true
    } catch (err) {
      notifyUpdate(notificationId, {
        type: "error",
        title: t("Error"),
        subtitle: (err as Error).message,
      })
      return false
    }
  }, [account, t])

  return { canToggleIsPortfolio, toggleLabel, toggleIsPortfolio }
}
