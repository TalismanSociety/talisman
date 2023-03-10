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

export const useSendFundsInputNumber = (ref: RefObject<HTMLInputElement>, decimals = 18) => {
  useEffect(() => {
    const input = ref.current
    if (!input) return () => {}

    const handler = getInputFilter((value: string) =>
      // eslint-disable-next-line no-useless-escape
      new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`).test(value)
    )

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
    // ref?.current will toggle between defined and not, it's imperative to resubscribe each time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decimals, ref?.current])
}
