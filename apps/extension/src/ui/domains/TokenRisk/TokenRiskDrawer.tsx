import { Button } from "@ui/components/Button"
import { Checkbox } from "@ui/components/Checkbox"
import { Drawer } from "@ui/components/Drawer"
import { type FC, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { TokenRiskDetails } from "./TokenRiskDetails"
import type { TokenRiskScan } from "./tokenRiskScan"

type TokenRiskDrawerProps = {
  scan: TokenRiskScan | null
  symbol: string | undefined
  isOpen: boolean
  containerId?: string
  onDismiss: () => void
  onAccept?: () => void
  requireAcknowledgement?: boolean
}

export const TokenRiskDrawer: FC<TokenRiskDrawerProps> = ({
  scan,
  symbol,
  isOpen,
  containerId,
  onDismiss,
  onAccept,
  requireAcknowledgement,
}) => {
  const { t } = useTranslation()
  const [isAcknowledged, setIsAcknowledged] = useState(false)
  const [displayed, setDisplayed] = useState<{ scan: TokenRiskScan; symbol: string } | null>(null)

  useEffect(() => {
    if (scan && symbol) setDisplayed({ scan, symbol })
  }, [scan, symbol])

  useEffect(() => {
    if (!isOpen) setIsAcknowledged(false)
  }, [isOpen])

  const needsAcknowledgement = !!requireAcknowledgement && displayed?.scan.verdict === "Malicious"

  return (
    <Drawer anchor="bottom" isOpen={isOpen} onDismiss={onDismiss} containerId={containerId}>
      {displayed && (
        <div className="flex flex-col items-center gap-8 rounded-t-xl bg-grey-800 p-12">
          <TokenRiskDetails scan={displayed.scan} symbol={displayed.symbol} />
          {onAccept && needsAcknowledgement && (
            <div className="w-full text-body-secondary text-sm">
              <Checkbox
                checked={isAcknowledged}
                onChange={(e) => setIsAcknowledged(e.target.checked)}
              >
                {t("I acknowledge the risks")}
              </Checkbox>
            </div>
          )}
          {onAccept ? (
            <div className="grid w-full grid-cols-2 gap-8">
              <Button onClick={onDismiss}>{t("Back")}</Button>
              <Button primary disabled={needsAcknowledgement && !isAcknowledged} onClick={onAccept}>
                {needsAcknowledgement ? t("Proceed") : t("I Understand")}
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={onDismiss}>
              {t("Close")}
            </Button>
          )}
        </div>
      )}
    </Drawer>
  )
}
