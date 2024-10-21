import { FC } from "react"
import { useTranslation } from "react-i18next"

import { TogglePill } from "@talisman/components/TogglePill"
import { useSetting } from "@ui/state"

type EnableTestnetPillButtonProps = {
  className?: string
}

export const EnableTestnetPillButton: FC<EnableTestnetPillButtonProps> = ({ className }) => {
  const { t } = useTranslation("admin")
  const [useTestnets, setUseTestnets] = useSetting("useTestnets")

  return (
    <TogglePill
      label={t("Enable testnets")}
      checked={useTestnets}
      onChange={setUseTestnets}
      className={className}
    />
  )
}
