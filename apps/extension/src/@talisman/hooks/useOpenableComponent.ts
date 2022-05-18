import { useEffect, useState } from "react"

export const useOpenableComponent = (open = false, hideAnimDuration = 200) => {
  const [render, setRender] = useState(open)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (open) {
      // render component once before triggering animation
      setRender(true)
      // wait for component to be rendered, then trigger show animation
      const timeout = setTimeout(() => setShow(true), 50)
      return () => {
        clearTimeout(timeout)
        setShow(true)
      }
    } else {
      // trigger slide out animation
      setShow(false)
      // remove component from DOM after hide animation
      const timeout = setTimeout(() => {
        setRender(false)
      }, hideAnimDuration)
      return () => {
        clearTimeout(timeout)
        setRender(false)
      }
    }
  }, [hideAnimDuration, open])

  return { render, show }
}
