import { DEBUG } from "@extension/shared"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { dcent } from "@ui/util/dcent"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import { DcentAccountsList } from "./DcentAccountsList"

export const ConnectDcentAccountsPage = () => {
  const { t } = useTranslation("admin")

  // On unmount, close pop-up window of D'CENT Bridge Service
  useEffect(() => {
    return () => {
      // Skip this in dev mode because of React StrictMode
      if (!DEBUG) dcent.popupWindowClose()
    }
  }, [])

  return (
    <>
      <HeaderBlock
        title={t("Connect D'CENT account")}
        text={t("Which account(s) would you like to connect ?")}
      />
      <Spacer small />
      <DcentAccountsList />
    </>
  )
}
