import { classNames } from "@talismn/util"
import { useScrollContainer } from "@ui/components/ScrollContainer"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import imgAnimation1 from "./monad-animated-1.gif"
import imgAnimation2 from "./monad-animated-2.gif"

export const MonadAnimation = () => {
  const { ref: refContainer } = useScrollContainer()
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = []

    const addTimeout = (callback: () => void, delay: number) => {
      const timeout = setTimeout(callback, delay)
      timeouts.push(timeout)
    }

    setStep(1)

    addTimeout(() => setStep(2), 2000)
    addTimeout(() => setStep(3), 5000)

    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [])

  return createPortal(
    <div className={"absolute bottom-28 left-0 w-full"}>
      <div
        className={classNames(
          "relative h-23.25 w-26.25 -translate-x-full opacity-100 duration-[2s] ease-out",
          step > 0 && "translate-x-37",
          step === 3 && "opacity-0 duration-500 ease-out"
        )}
      >
        <img
          src={imgAnimation1}
          alt=""
          className={classNames("absolute size-full", step <= 1 ? "visible" : "invisible")}
        />
        <img
          src={imgAnimation2}
          alt=""
          className={classNames("absolute size-full", step > 1 ? "visible" : "invisible")}
        />
      </div>
    </div>,
    refContainer.current as HTMLElement
  )
}
