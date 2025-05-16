import { ExternalLinkIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

import { useAppState, useFeatureFlag } from "@ui/state"

import bg from "./assets/autonomys-quest-bg.png"

export const AutonomysQuestBanner = () => {
  const { t } = useTranslation()
  const allowBanner = useFeatureFlag("AUTONOMYS_QUEST_BANNER")
  const [hideBanner, setHideBanner] = useAppState("hideAutonomysQuestBanner")

  const showBanner = useMemo(() => allowBanner && !hideBanner, [allowBanner, hideBanner])

  if (!showBanner) return null

  return (
    <div className={classNames("relative h-40 w-full overflow-hidden")}>
      <div className="text-tiny absolute left-0 top-0 z-10 flex size-full select-none flex-col justify-start overflow-hidden p-6 py-4">
        <div className="leading-paragraph flex w-full items-center gap-4 text-base">
          <div className="grow text-sm font-bold">
            <Trans
              t={t}
              components={{
                Blue: (
                  <span className="inline-block bg-gradient-to-tl from-white via-[#B6C7FF] to-[#5B81FF] bg-clip-text text-transparent"></span>
                ),
              }}
              defaults="Discover Autonomys <Blue>Quest</Blue>"
            />
          </div>
          <div>
            <IconButton
              className="text-md text-body select-auto"
              onClick={() => setHideBanner(true)}
            >
              <XIcon />
            </IconButton>
          </div>
        </div>
        <div className="flex w-[27rem] grow flex-col justify-center">
          <p className="text-body-secondary line-clamp-2 text-xs">
            {t("Earn $AI3 and participate in the Quest for a chance to win $2000 in prizes.")}{" "}
            <button
              type="button"
              className="text-body inline-flex items-center gap-1"
              onClick={() => window.open("https://quest.talisman.xyz/quests", "_blank")}
            >
              <div>{t("Details")}</div>
              <ExternalLinkIcon />
            </button>
          </p>
        </div>
      </div>
      <div
        className={classNames(
          "absolute left-0 top-0 size-full overflow-hidden rounded-sm",
          "to-grey-800 bg-gradient-to-r from-[#3B497B] p-0.5",
        )}
      >
        <img alt="" src={bg} className="bg-black-secondary size-full rounded-sm bg-cover" />
      </div>
    </div>
  )
}
