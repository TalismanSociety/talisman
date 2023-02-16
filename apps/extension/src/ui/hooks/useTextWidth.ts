import { RefObject, useCallback, useEffect, useMemo, useState } from "react"
import { node } from "webpack"

const getTextWidth = (text?: string, element?: HTMLElement) => {
  if (!text?.length) return 0
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) return 0
  context.font = element ? window.getComputedStyle(element).font : ""
  const metrics = context.measureText(text)
  //console.log("getTextWidth", text, context.font, !!element)
  return metrics.width
}

const checkSize = (input: HTMLInputElement) => {
  const width = getTextWidth(input.value?.length ? input.value : input.placeholder ?? "0", input)
  if (width !== input.clientWidth) input.style.width = `${width}px`
}

export const useInputAutoSize = (ref?: RefObject<HTMLInputElement>) => {
  useEffect(() => {
    if (!ref?.current) return
    const input = ref.current

    const observer = new MutationObserver((changes) => {
      if (!changes.find((c) => ["value", "placeholder"].includes(c.attributeName ?? ""))) return
      checkSize(input)
    })

    observer.observe(input, { attributes: true, childList: false, subtree: false })

    // init
    checkSize(input)

    return () => {
      observer.disconnect()
    }
  }, [ref])
}
