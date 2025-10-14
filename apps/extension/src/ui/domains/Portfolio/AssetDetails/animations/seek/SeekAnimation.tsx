import { cn } from "@talismn/util"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import imgAnimation from "./seek-animation.gif"

type AnimState = "hidden" | "visible" | "hiding"

const ANIMATION_DURATION = 25000 // 25 seconds

export const SeekAnimation = () => {
  const [state, setState] = useState<AnimState>("hidden")

  const hide = () => {
    // fade out
    setState("hiding")

    // hide
    setTimeout(() => {
      setState("hidden")
    }, 500)
  }

  useEffect(() => {
    // fade in
    const t1 = setTimeout(() => {
      setState("visible")
    }, 1)

    const t2 = setTimeout(() => {
      hide()
    }, ANIMATION_DURATION)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return createPortal(
    <div
      className={cn(
        "bg-black-primary/70 absolute left-0 top-0 size-full opacity-0 transition-opacity duration-500 ease-out",
        state === "visible" && "opacity-100",
        state === "hiding" && "opacity-0",
        state === "hidden" && "hidden",
      )}
    >
      <button type="button" onClick={hide}>
        <img src={imgAnimation} alt="" className="aspect-[4/6] size-full" />
      </button>
    </div>,
    document.getElementById("main") as HTMLElement,
  )
}
