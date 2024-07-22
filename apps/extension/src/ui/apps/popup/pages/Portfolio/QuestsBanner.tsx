import { QuestStarIcon } from "@talismn/icons"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import { useRandomInterval } from "@ui/hooks/useRandomInterval"

import QuestsSvg from "./assets/quests.svg?url"

const QuestsBg = `linear-gradient(
  89.9deg,
  rgb(247, 229, 231) -4.24%,
  rgb(255, 255, 255) 64.35%,
  rgb(224, 236, 251) 108.23%
)`

export const QuestsBanner = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className="font-inter flex flex-col items-center gap-4 rounded px-4 pt-12 text-black"
      style={{ background: QuestsBg }}
      onClick={onClick}
    >
      <div className="font-unbounded text-[2rem] font-extrabold">{t("Talisman Quests")}</div>
      <div className="-mt-2 text-[1.2rem] font-light">
        {t("Explore a multi-chain world & earn points")}
      </div>
      <div className="relative mt-2 rounded-sm bg-black px-16 py-3 text-[1.2rem] font-semibold text-white">
        <QuestSparkles />
        {t("Join")}
      </div>
      <img alt="" src={QuestsSvg} className="mt-4 aspect-[300/73] w-2/3" />
    </button>
  )
}

/**
 * Strongly inspired by https://www.joshwcomeau.com/react/animated-sparkles-in-react/
 */
const QuestSparkles = () => {
  type SparkleConfig = { id: number; x: string; y: string; size: number }
  const [sparkles, setSparkles] = useState<Array<SparkleConfig>>([])

  const addSparkle = useCallback(() => {
    setSparkles((sparkles) => {
      const now = Date.now()
      const activeSparkles = sparkles.filter(({ id }) => now - id < 2000)

      const minPos = 90
      const maxPos = 10
      const randomPos = () => `${Math.round(Math.random() * (maxPos - minPos) + minPos)}%`

      const minSize = 6
      const maxSize = 10
      const randomSize = () => Math.floor(Math.random() * (maxSize - minSize) + minSize)

      const newSparkle = { id: now, x: randomPos(), y: randomPos(), size: randomSize() }

      return [...activeSparkles, newSparkle]
    })
  }, [])
  useRandomInterval(addSparkle, 100, 600)

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 top-0">
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: sparkle.x, top: sparkle.y }}
        >
          <div className="animate-scale-in-out-once">
            <QuestStarIcon
              className="text-primary animate-spin-once"
              style={{ fontSize: sparkle.size }}
            />
          </div>
        </div>
      ))}

      <div className="absolute right-[9px] top-[6px]">
        <div className="animate-[scale-in-out_1500ms_infinite]">
          <QuestStarIcon className="text-primary animate-spin-slow text-[8px]" />
        </div>
      </div>
      <div className="absolute bottom-[6px] left-[10px]">
        <div className="animate-[scale-in-out_1000ms_infinite_500ms]">
          <QuestStarIcon className="text-primary animate-spin-slow text-[5px]" />
        </div>
      </div>
    </div>
  )
}
