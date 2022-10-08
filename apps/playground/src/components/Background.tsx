import { ReactNode, useCallback, useMemo, useState } from "react"
import { Button, classNames, MysticalBackground, MysticalBackgroundOld } from "talisman-ui"
import { IconArrowRight } from "../icons"
import { TestLayout } from "./TestLayout"

export const Background = () => {
  const [showNew, setShowNew] = useState(false)
  const [seed, setSeed] = useState("start")

  const bgKey = useMemo(() => `${showNew}-${seed}`, [seed, showNew])

  const handleChangeClick = useCallback(() => {
    setShowNew((prev) => !prev)
  }, [])

  const handleResetClick = useCallback(() => {
    setSeed(crypto.randomUUID())
  }, [])

  return (
    <TestLayout title="Mystical Background">
      <div className="space-y-4">
        <div>
          Current background :{" "}
          <span
            className={classNames("font-bold", showNew ? "text-alert-success" : "text-alert-warn")}
          >
            {showNew ? "NEW" : "OLD"}
          </span>
        </div>
        <div className="space-x-4">
          <Button onClick={handleChangeClick}>Change background version</Button>
          <Button onClick={handleResetClick}>Reset background</Button>
        </div>
      </div>
      <div className="fixed top-0 left-0 -z-10 m-0 block h-full  w-full  overflow-hidden">
        {showNew && (
          <MysticalBackground key={bgKey} className="absolute top-0 left-0 h-full w-full" />
        )}
        {!showNew && (
          <MysticalBackgroundOld key={bgKey} className="absolute top-0 left-0 h-full w-full" />
        )}
      </div>
    </TestLayout>
  )
}
