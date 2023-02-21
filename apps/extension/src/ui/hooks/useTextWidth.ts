import { RefObject, useCallback, useEffect } from "react"

const getTextWidth = (text?: string, element?: HTMLElement) => {
  if (!text?.length) return 0
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) return 0
  context.font = element ? window.getComputedStyle(element).font : ""
  const metrics = context.measureText(text)
  return metrics.width
}

const checkSize = (input: HTMLInputElement) => {
  const text = input.value || input.placeholder || "0"
  const width = getTextWidth(text, input)

  if (width !== input.clientWidth) input.style.width = `${width}px`
}

// works only with uncontrolled inputs
export const useInputAutoSize = (ref?: RefObject<HTMLInputElement>) => {
  const resize = useCallback(() => {
    const input = ref?.current
    if (!input) return
    checkSize(input)
  }, [ref])

  useEffect(() => {
    const input = ref?.current
    if (!input) return

    input.addEventListener("input", resize)

    resize()

    return () => {
      input.removeEventListener("input", resize)
    }
  }, [ref, resize])

  return resize
}
