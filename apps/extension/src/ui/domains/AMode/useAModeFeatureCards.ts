import { isNotNil } from "@talismn/util"
import { useMnemonicsAllBackedUp } from "@ui/hooks/useMnemonicsAllBackedUp"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { AModeShortcut } from "./types"

export type AModeFeatureCard = {
  shortcut: AModeShortcut
  copy: string
}

/** banner cards for real wallet features, each acting through its registry shortcut */
export const useAModeFeatureCards = (
  byId: Readonly<Record<string, AModeShortcut>>
): AModeFeatureCard[] => {
  const { t } = useTranslation()
  const allBackedUp = useMnemonicsAllBackedUp()

  return useMemo(() => {
    const card = (id: string, copy: string, show = true): AModeFeatureCard | null => {
      const shortcut = byId[id]
      return show && shortcut ? { shortcut, copy } : null
    }

    return [
      card(
        "recovery-phrases",
        t("Back up your recovery phrase so you can restore this wallet"),
        !allBackedUp
      ),
      card("earn", t("Stake and earn yield on the tokens you hold")),
      card("swap", t("Swap tokens without leaving your wallet")),
      card("trade-tao", t("Trade subnet tokens on the TAO dashboard")),
      card("buy-sell", t("Buy or sell crypto from inside your wallet")),
    ].filter(isNotNil)
  }, [byId, allBackedUp, t])
}
