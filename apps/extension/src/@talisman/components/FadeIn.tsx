import { ReactNode, useEffect, useState } from "react"
import { Box } from "./Box"

export const FadeIn = ({ children }: { children: ReactNode }) => {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    setOpacity(1)
  }, [])

  return (
    <Box transition opacity={opacity}>
      {children}
    </Box>
  )
}
