import Toggle from "@talisman/components/Field/Toggle"
import { useSettings } from "@ui/hooks/useSettings"
import { useCallback } from "react"

export const EnableTestnetToggle = () => {
  const { useTestnets, update } = useSettings()

  const handleChange = useCallback(
    (useTestnets: boolean) => {
      update({ useTestnets })
    },
    [update]
  )

  return (
    <div className="text-body-secondary flex">
      <Toggle value={useTestnets} onChange={handleChange} />
      <span className="text-sm">Enable testnets</span>
    </div>
  )
}
