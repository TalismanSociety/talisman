import { useEffect, useState } from "react"

export const useWindowHovered = () => {
  const [windowHovered, setWindowHovered] = useState(false)

  useEffect(() => {
    const handleMouseOver = () => {
      setWindowHovered(true)
    }
    const handleMouseOut = () => {
      setWindowHovered(false)
    }

    window.addEventListener("mouseover", handleMouseOver)
    window.addEventListener("mouseout", handleMouseOut)

    return () => {
      window.removeEventListener("mouseover", handleMouseOver)
      window.removeEventListener("mouseout", handleMouseOut)
    }
  }, [])

  return windowHovered
}
