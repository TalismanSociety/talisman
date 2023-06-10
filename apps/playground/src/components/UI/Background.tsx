import { classNames } from "@talismn/util"
import { useCallback, useMemo, useState } from "react"
import {
  Button,
  MYSTICAL_PHYSICS_V2,
  MYSTICAL_PHYSICS_V3,
  MysticalBackgroundV2,
  MysticalBackgroundV3,
  MysticalPhysicsV2,
  MysticalPhysicsV3,
} from "talisman-ui"

import { Layout } from "../shared/Layout"

type BgVersion = "v2" | "v3"

export const Background = () => {
  const [seed, setSeed] = useState("start")
  const [bgVersion, setBgVersion] = useState<BgVersion>("v3")
  const [strConfigV2, setStrConfigV2] = useState(JSON.stringify(MYSTICAL_PHYSICS_V2, undefined, 2))
  const [strConfigV3, setStrConfigV3] = useState(JSON.stringify(MYSTICAL_PHYSICS_V3, undefined, 2))
  const bgKey = useMemo(() => `${bgVersion}-${seed}`, [seed, bgVersion])

  const handleVersionClick = useCallback(
    (version: BgVersion) => () => {
      setBgVersion(version)
    },
    []
  )

  const handleResetClick = useCallback(() => {
    setSeed(crypto.randomUUID())
  }, [])

  const configV2 = useMemo(() => {
    try {
      return JSON.parse(strConfigV2) as MysticalPhysicsV2
    } catch (err) {
      return undefined
    }
  }, [strConfigV2])

  const configV3 = useMemo(() => {
    try {
      return JSON.parse(strConfigV3) as MysticalPhysicsV3
    } catch (err) {
      return undefined
    }
  }, [strConfigV3])

  return (
    <Layout title="Mystical Background">
      <div className="space-y-8">
        <div className="space-x-4">
          <Button primary={bgVersion === "v2"} onClick={handleVersionClick("v2")}>
            V2
          </Button>
          <Button primary={bgVersion === "v3"} onClick={handleVersionClick("v3")}>
            V3
          </Button>
          <Button onClick={handleResetClick}>Reset background</Button>
        </div>
        <div>
          <div className="text-body-secondary mb-4">V2 config :</div>
          <textarea
            spellCheck={false}
            className={classNames(
              "text-body-secondary h-full w-full resize-none rounded bg-white/5 p-8 font-mono backdrop-blur-[9.6rem]",
              configV2 === null && "outline-alert-error outline"
            )}
            onChange={(e) => setStrConfigV2(e.target.value)}
            defaultValue={strConfigV2}
            rows={20}
          />
          {configV2 === null && <div className="text-alert-error">Invalid JSON</div>}
        </div>
        <div>
          <div className="text-body-secondary mb-4">V3 config :</div>
          <textarea
            spellCheck={false}
            className={classNames(
              "text-body-secondary h-full w-full resize-none rounded bg-white/5 p-8 font-mono backdrop-blur-[9.6rem]",
              configV3 === null && "outline-alert-error outline"
            )}
            onChange={(e) => setStrConfigV3(e.target.value)}
            defaultValue={strConfigV3}
            rows={20}
          />
          {configV3 === null && <div className="text-alert-error">Invalid JSON</div>}
        </div>
      </div>
      <div className="fixed left-0 top-0 -z-10 m-0 block h-full  w-full  overflow-hidden">
        {bgVersion === "v2" && (
          <MysticalBackgroundV2
            config={configV2}
            key={bgKey}
            className="absolute left-0 top-0 h-full w-full"
          />
        )}
        {bgVersion === "v3" && (
          <MysticalBackgroundV3
            config={configV3}
            key={bgKey}
            className="absolute left-0 top-0 h-full w-full"
          />
        )}
      </div>
    </Layout>
  )
}
