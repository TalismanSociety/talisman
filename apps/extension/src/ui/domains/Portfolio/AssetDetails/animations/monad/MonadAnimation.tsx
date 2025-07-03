import { classNames } from "@talismn/util"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import { useScrollContainer } from "@talisman/components/ScrollContainer"

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
          "relative h-[9.3rem] w-[10.5rem] -translate-x-[100%] opacity-100 duration-[2s] ease-out",
          step > 0 && "translate-x-[14.8rem]",
          step === 3 && "opacity-0 duration-500 ease-out",
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
    refContainer.current as HTMLElement,
  )
}
