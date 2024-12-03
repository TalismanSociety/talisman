import { RefObject, useEffect } from "react"

const getTextWidth = (text: string, element: HTMLElement) => {
  if (!text?.length) return 0
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) return 0
  context.font = window.getComputedStyle(element).font
  const metrics = context.measureText(text)
  return metrics.width
}

const checkSize = (input: HTMLInputElement) => {
  const text = input.value || input.placeholder || "0"
  const width = getTextWidth(text, input)
  if (width !== input.clientWidth) input.style.width = `${width}px`
}

// works only with uncontrolled inputs
export const useInputAutoWidth = (ref: RefObject<HTMLInputElement>) => {
  useEffect(() => {
    const input = ref.current
    if (!input) return

    const resize = () => checkSize(input)

    input.addEventListener("input", resize)
    input.addEventListener("keyup", resize)

    const observer = new MutationObserver(resize)
    observer.observe(input, { attributes: true, childList: false, subtree: false })

    // size will change once our font will be loaded
    document.fonts.ready.then(resize)
    resize()

    return () => {
      observer.disconnect()
      input.removeEventListener("input", resize)
      input.removeEventListener("keyup", resize)
    }
  }, [ref])
}
