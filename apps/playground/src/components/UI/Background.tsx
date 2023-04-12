import { classNames } from "@talismn/util"
import { useCallback, useMemo, useState } from "react"
import {
  Button,
  MYSTICAL_PHYSICS,
  MysticalBackground,
  MysticalBackgroundOld,
  MysticalPhysics,
} from "talisman-ui"

import { TestLayout } from "../shared/TestLayout"

export const Background = () => {
  const [showNew, setShowNew] = useState(true)
  const [seed, setSeed] = useState("start")
  const [strConfig, setStrConfig] = useState(JSON.stringify(MYSTICAL_PHYSICS, undefined, 2))

  const bgKey = useMemo(() => `${showNew}-${seed}`, [seed, showNew])

  const handleChangeClick = useCallback(() => {
    setShowNew((prev) => !prev)
  }, [])

  const handleResetClick = useCallback(() => {
    setSeed(crypto.randomUUID())
  }, [])

  const config = useMemo(() => {
    try {
      return JSON.parse(strConfig) as MysticalPhysics
    } catch (err) {
      return null as unknown as MysticalPhysics
    }
  }, [strConfig])

  return (
    <TestLayout title="Mystical Background">
      <div className="space-y-8">
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
        <div>
          <div className="text-body-secondary mb-4">
            Mystical Physics - only applied on NEW background :
          </div>
          <textarea
            spellCheck={false}
            className={classNames(
              "text-body-secondary h-full w-full resize-none rounded bg-white/5 p-8 font-mono backdrop-blur-[9.6rem]",
              config === null && "outline-alert-error outline"
            )}
            onChange={(e) => setStrConfig(e.target.value)}
            defaultValue={strConfig}
            rows={20}
          />
          {config === null && <div className="text-alert-error">Invalid JSON</div>}
        </div>
      </div>
      <div className="fixed top-0 left-0 -z-10 m-0 block h-full  w-full  overflow-hidden">
        {showNew && (
          <MysticalBackground
            config={config}
            key={bgKey}
            className="absolute top-0 left-0 h-full w-full"
          />
        )}
        {!showNew && (
          <MysticalBackgroundOld key={bgKey} className="absolute top-0 left-0 h-full w-full" />
        )}
      </div>
    </TestLayout>
  )
}
