import Toggle from "@talisman/components/Field/Toggle"
import { useSettings } from "@ui/hooks/useSettings"
import { FC, useCallback } from "react"
import { PillButton } from "talisman-ui"

const Checked = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M9.11114 3.66675L4.83336 7.94453L2.88892 6.00008"
      stroke="#D5FF5C"
      strokeWidth="0.888889"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const Unchecked = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="0.333333"
      y="0.333333"
      width="11.3333"
      height="11.3333"
      rx="2.33333"
      stroke="currentColor"
      strokeWidth="0.666667"
    />
  </svg>
)

type EnableTestnetPillButtonProps = {
  className?: string
}

export const EnableTestnetPillButton: FC<EnableTestnetPillButtonProps> = ({ className }) => {
  const { useTestnets, update } = useSettings()

  const handleClick = useCallback(() => {
    update({ useTestnets: !useTestnets })
  }, [update, useTestnets])

  return (
    <PillButton
      icon={useTestnets ? Checked : Unchecked}
      onClick={handleClick}
      size="xs"
      className={className}
    >
      Enable testnets
    </PillButton>
  )
}
