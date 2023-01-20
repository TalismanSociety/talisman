// adapted from https://stackoverflow.com/a/469362
import { RefObject, useEffect } from "react"

const getInputFilter = (inputFilter: (text: string) => boolean) =>
  function (
    this: (HTMLInputElement | HTMLTextAreaElement) & {
      oldValue: string
      oldSelectionStart: number | null
      oldSelectionEnd: number | null
    }
  ) {
    if (inputFilter(this.value)) {
      this.oldValue = this.value
      this.oldSelectionStart = this.selectionStart
      this.oldSelectionEnd = this.selectionEnd
    } else if (Object.prototype.hasOwnProperty.call(this, "oldValue")) {
      this.value = this.oldValue

      if (this.oldSelectionStart !== null && this.oldSelectionEnd !== null) {
        this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd)
      }
    } else {
      this.value = ""
    }
  }

// TODO : max decimals
// TODO : pad 0 left
export const useInputNumberOnly = (ref: RefObject<HTMLInputElement>) => {
  useEffect(() => {
    const input = ref.current
    if (!input) return () => {}

    const handler = getInputFilter((value: string) => /^\d*\.?\d*$/.test(value))

    const events = [
      "input",
      "keydown",
      "keyup",
      "mousedown",
      "mouseup",
      "select",
      "contextmenu",
      "drop",
      "focusout",
    ]

    events.forEach((eventName) => input.addEventListener(eventName, handler))

    return () => {
      events.forEach((eventName) => input.removeEventListener(eventName, handler))
    }
  }, [ref])
}
