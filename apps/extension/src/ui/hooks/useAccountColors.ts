import { useTalismanOrb } from "@talismn/orb"
import { useMemo } from "react"

const TALISMAN_COLORS = ["#fd4848", "#d5ff5c"] as const

export const useAccountColors = (address?: string) => {
  const { bgColor1, bgColor2 } = useTalismanOrb(address ?? "")

  return useMemo(
    () => (address ? [bgColor1, bgColor2] : TALISMAN_COLORS) as [string, string],
    [address, bgColor1, bgColor2]
  )
}
