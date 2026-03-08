import { useId, useMemo } from "react"

import { computeTalismanOrb } from "../computeTalismanOrb"

export const useTalismanOrb = (seed: string) => {
  const id = useId()

  return useMemo(() => {
    return {
      id, // multiple avatars should cohabit on the same page
      ...computeTalismanOrb(seed),
    }
  }, [id, seed])
}
