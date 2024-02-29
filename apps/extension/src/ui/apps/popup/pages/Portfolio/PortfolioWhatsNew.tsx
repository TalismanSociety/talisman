import { HandMonoLogo } from "@talisman/theme/logos"
import * as Icons from "@talismn/icons"
import { ChevronLeftIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useSetting } from "@ui/hooks/useSettings"
import DOMPurify from "dompurify"
import { marked } from "marked"
import { useCallback, useLayoutEffect, useMemo, useRef } from "react"
import { createRoot } from "react-dom/client"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import HeroUrl from "./assets/Whats New - Hero.png"
import whatsNewContent from "./assets/Whats New.md"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "What's New",
}

const newGoToFn = (dashboardPath: string) => () => {
  sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: dashboardPath })
  return api.dashboardOpen(dashboardPath)
}

/**
 * This string should be changed when we want to show the `What's New` banner
 * to users who have dismissed it in the past.
 *
 * E.g. when we have new features to tell them about.
 */
export const WhatsNewVersion =
  /version: (?<version>v[0-9.]+)/im.exec(whatsNewContent)?.groups?.version ?? "0"

export const PortfolioWhatsNew = () => {
  const { t } = useTranslation()

  const whatsNewLocalizedContent = t(whatsNewContent)
  const whatsNewHtml = useMemo(
    () =>
      DOMPurify.sanitize(marked(whatsNewLocalizedContent, { gfm: true, async: false }) as string),
    [whatsNewLocalizedContent]
  )

  const whatsNewHtmlRef = useWhatsNewNodes(whatsNewHtml)

  return (
    <div className="text-body-secondary flex flex-col gap-12 pb-12 text-sm">
      <div className="relative">
        <img
          className="pointer-events-none relative aspect-[1456/752] w-full rounded-sm"
          src={HeroUrl}
          alt="a hero banner"
        />
        <div className="pointer-events-none absolute left-0 top-0 flex h-full w-full flex-col gap-4 p-8">
          <div className="font-whyteInkTrap flex items-center gap-1 text-sm tracking-tight text-white">
            <HandMonoLogo className="text-base" />
            Talisman
          </div>
          <div className="text-primary text-2xl font-extrabold capitalize">{WhatsNewVersion}</div>
        </div>
      </div>
      <div>
        <div
          ref={whatsNewHtmlRef}
          className="[&_a]:text-bold [&_a]:text-grey-200 flex flex-col gap-12 [&_a:hover]:text-white [&_strong]:font-normal [&_strong]:text-white"
          dangerouslySetInnerHTML={{ __html: whatsNewHtml ?? "" }}
        />
      </div>
    </div>
  )
}

export const PortfolioWhatsNewHeader = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dismissedVersion, setDismissedVersion] = useSetting("newFeaturesDismissed")

  const goToPortfolio = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Portfolio" })
    return navigate("/portfolio")
  }, [navigate])

  const dismiss = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Interact", action: "Dismiss What's New" })
    setDismissedVersion(WhatsNewVersion)

    goToPortfolio()
  }, [goToPortfolio, setDismissedVersion])

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
        {dismissedVersion === WhatsNewVersion ? (
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
          <button className="text-bold text-grey-200 hover:text-white" onClick={goTo}>
            {innerText}{" "}
            <Icons.ExternalLinkIcon className="inline h-[1.25em] w-[1.25em] align-text-bottom" />
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
