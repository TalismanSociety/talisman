import { classNames } from "@talismn/util"
import { FC, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { ErrorMessageDrawer } from "./ErrorMessageDrawer"
import { SignHardwareSubstrateProps } from "./SignHardwareSubstrate"

export type DcentSubstratePayload = {
  coinType: string
  sigHash: string
  fee: string
  path: string
  symbol: string
  decimals: number
}

export const SignDcentUnsupportedMessage: FC<
  Pick<SignHardwareSubstrateProps, "containerId" | "className" | "onCancel">
> = ({ containerId, className, onCancel }) => {
  const { t } = useTranslation("admin")

  const [displayedErrorMessage, setDisplayedErrorMessage] = useState<string | undefined>(
    t("Sorry, D'CENT is no longer supported in Talisman"),
  )

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      {onCancel && (
        <Button className="w-full" onClick={onCancel}>
          {t("Close")}
        </Button>
      )}
      <ErrorMessageDrawer
        message={displayedErrorMessage}
        containerId={containerId}
        onDismiss={() => setDisplayedErrorMessage(undefined)}
      />
    </div>
  )
}
