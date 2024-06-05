import * as Icons from "@talismn/icons"
import { ChevronLeftIcon, ExternalLinkIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useSetting } from "@ui/hooks/useSettings"
import DOMPurify from "dompurify"
import { QUEST_APP_URL } from "extension-shared"
import { marked } from "marked"
import { useCallback, useLayoutEffect, useMemo, useRef } from "react"
import { createRoot } from "react-dom/client"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { rcompare } from "semver"

import { latestUpdates } from "./assets/whats-new"
import { QuestsBanner } from "./QuestsBanner"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "What's New",
}

const WHATS_NEW_LENGTH = 3

const newGoToFn = (dashboardPath: string) => () => {
  sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: dashboardPath })
  return api.dashboardOpen(dashboardPath)
}

export const getWhatsNewVersions = () => {
  return Object.keys(latestUpdates).sort(rcompare)
}

export const PortfolioWhatsNewSection = ({
  content,
  heroUrl,
  date,
  version,
}: {
  content: string
  heroUrl?: string
  date?: string
  version: string
}) => {
  const { t } = useTranslation()

  const whatsNewLocalizedContent = t(content)
  const whatsNewHtml = useMemo(
    () =>
      DOMPurify.sanitize(marked(whatsNewLocalizedContent, { gfm: true, async: false }) as string),
    [whatsNewLocalizedContent]
  )

  const whatsNewHtmlRef = useWhatsNewNodes(whatsNewHtml)

  return (
    <div>
      <div className="text-body-secondary flex flex-col gap-12 pb-12 text-sm">
        <div
          className={classNames(
            "relative",
            heroUrl && "h-[119px]",
            !heroUrl && "flex items-center justify-between overflow-hidden rounded-sm p-5"
          )}
        >
          {heroUrl && (
            <img
              className="pointer-events-none relative w-full rounded-sm"
              src={heroUrl}
              alt="a hero banner"
            />
          )}
          {!heroUrl && (
            <div className="bg-grey-900 pointer-events-none absolute bottom-0 left-0 right-0 top-0">
              <div className="bg-grey-600/10 absolute right-0 h-full w-full translate-x-2/3 -skew-x-[60deg]" />
            </div>
          )}
          <div className={`pointer-events-none ${heroUrl ? "absolute left-5 top-5" : "relative"}`}>
            <div className="text-primary font-bold">V{version}</div>
          </div>
          {date && (
            <div
              className={`pointer-events-none ${heroUrl ? "absolute right-5 top-5" : "relative"}`}
            >
              <div className="text-grey-200 text-xs">{date}</div>
            </div>
          )}
        </div>
        <div className="px-5">
          <div
            ref={whatsNewHtmlRef}
            className="[&_a]:text-bold [&_a]:text-grey-200 flex flex-col gap-8 [&_a:hover]:text-white [&_strong]:font-normal [&_strong]:text-white"
            dangerouslySetInnerHTML={{ __html: whatsNewHtml ?? "" }}
          />
        </div>
      </div>
      <div className="border-black-secondary mt-8 border border-b-[1px]" />
    </div>
  )
}

export const PortfolioWhatsNew = () => {
  const versions = getWhatsNewVersions()

  const openQuests = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Quests" })
    window.open(QUEST_APP_URL, "_blank")
    window.close()
  }, [])

  return (
    <div className="flex flex-col gap-16">
      <QuestsBanner onClick={openQuests} />
      {versions.slice(0, WHATS_NEW_LENGTH).map((version) => {
        const { content, HeroUrl, date } = latestUpdates[version as keyof typeof latestUpdates]
        return (
          <PortfolioWhatsNewSection
            key={version}
            content={content}
            heroUrl={HeroUrl}
            date={date}
            version={version}
          />
        )
      })}
    </div>
  )
}

export const PortfolioWhatsNewHeader = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dismissedVersion, setDismissedVersion] = useSetting("newFeaturesDismissed")
  const versions = getWhatsNewVersions()

  const goToPortfolio = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Portfolio" })
    return navigate("/portfolio")
  }, [navigate])

  const dismiss = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Interact", action: "Dismiss What's New" })
    setDismissedVersion(versions[0])

    goToPortfolio()
  }, [goToPortfolio, setDismissedVersion, versions])

  return (
    <header className="my-8 flex h-[3.6rem] w-full shrink-0 items-center justify-between gap-4 px-12">
      <div className="flex-1">
        <button type="button" className="p-6" onClick={goToPortfolio}>
          <ChevronLeftIcon />
        </button>
      </div>
      <div className="font-bold">
        <Trans t={t}>
          What's <span className="text-primary">New</span>
        </Trans>
      </div>
      <div className="flex-1 text-right">
        {dismissedVersion === versions[0] ? (
          <span />
        ) : (
          <button
            type="button"
            className="bg-grey-800 text-tiny hover:bg-grey-750 focus:bg-grey-750 rounded-sm p-4 text-white"
            onClick={dismiss}
          >
            {t("Dismiss")}
          </button>
        )}
      </div>
    </header>
  )
}

/**
 * Use this hook to add some 🌶️ spice 🌶️ to the What's New markdown contents.
 *
 * Examples:
 *
 * You can add this to your markdown to get an icon from `@talismn/icons`:
 *
 *     <span class="icon" data-icon="GlobeIcon"></span>
 *
 * You can add this to your markdown to get a button which links to any dashboard url:
 *
 *     <div class="button" data-app="dashboard" data-href="/settings/networks-tokens/networks/ethereum">Check it out</div>
 */
const useWhatsNewNodes = (whatsNewHtml: string) => {
  /** A ref to the `dangerouslySetInnerHTML={{ __html: whatsNewHtml ?? "" }}` div element */
  const whatsNewHtmlRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const ref = whatsNewHtmlRef.current
    if (!ref) return

    // set all anchors to have target="_blank"
    const anchors = ref.querySelectorAll("a")
    Array.from(anchors).flatMap((anchorRef) => {
      anchorRef.setAttribute("target", "_blank")
      anchorRef.setAttribute("rel", "noopener noreferrer")
    })

    // fancy icon nodes
    const icons = ref.querySelectorAll(".icon")
    const iconNodes = Array.from(icons).flatMap((iconRef) => {
      const iconName = iconRef.getAttribute("data-icon")
      if (!iconName) return []
      if (!(iconName in Icons)) return []

      const Icon = Icons[iconName as keyof typeof Icons]
      return {
        component: <Icon className="text-primary inline h-[1.25em] w-[1.25em] align-text-bottom" />,
        ref: iconRef,
      }
    })

    // fancy button nodes
    const buttons = ref.querySelectorAll(".button")
    const buttonNodes = Array.from(buttons).flatMap((buttonRef) => {
      const app = buttonRef.getAttribute("data-app")
      if (app !== "dashboard") return []

      const url = buttonRef.getAttribute("data-href")
      if (typeof url !== "string") return []

      const goTo = newGoToFn(url)
      const innerText = buttonRef.innerHTML

      return {
        component: (
          <button className="text-grey-200 text-xs hover:text-white" onClick={goTo}>
            {innerText} <ExternalLinkIcon className="inline align-middle" />
          </button>
        ),
        ref: buttonRef,
      }
    })

    // mount the fancy nodes
    const nodeRoots = [...iconNodes, ...buttonNodes].map(({ component, ref }) => {
      const root = createRoot(ref)
      root.render(component)
      return root
    })

    // prepare the fancy nodes to be unmounted when this hook unmounts
    return () => nodeRoots.forEach((root) => root.unmount())
  }, [whatsNewHtml])

  return whatsNewHtmlRef
}
